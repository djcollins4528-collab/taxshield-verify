import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {BASE,validate} from './live_auth_acceptance.mjs';

const env=validate(process.env);
assert.equal(env.PROOFLINE_HANDOFF_DRILL,'yes');
const id='72dc93cf-0011-4531-b54a-69ebccb244ac';
const endpoint=BASE+'/functions/v1/proofline-synthetic-handoff/'+id;
const signedIn=new Set();
const checks=[];
const expected=Buffer.from((await readFile(new URL('../supabase/proofline-synthetic-handoff/package.json.fixture',import.meta.url),'utf8')).replace(/\r\n/g,'\n').trimEnd()+'\n');
const digest=b=>createHash('sha256').update(b).digest('hex');
const receipt={package_id:id,expected_sha256:digest(expected),checks};
const headers=token=>({apikey:env.SUPABASE_PUBLISHABLE_KEY,...(token?{authorization:'Bearer '+token}:{})});
function http(url,opts={}){return fetch(url,{...opts,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});}
async function login(role){
 const r=await http(BASE+'/auth/v1/token?grant_type=password',{method:'POST',headers:{...headers(),'content-type':'application/json'},body:JSON.stringify({email:env['PROOFLINE_'+role+'_EMAIL'],password:env['PROOFLINE_'+role+'_PASSWORD']})});
 assert.equal(r.status,200,role+' sign-in');
 const d=await r.json();assert.ok(d.access_token);signedIn.add(d.access_token);
 return {token:d.access_token,user:d.user.id};
}
async function logout(token){
 const r=await http(BASE+'/auth/v1/logout?scope=local',{method:'POST',headers:headers(token)});
 assert.ok([200,204].includes(r.status),'Sign-out status '+r.status);signedIn.delete(token);
}
function call(action,token){return http(endpoint+'/'+action,{method:action==='package'?'GET':'POST',headers:headers(token)});}
async function check(name,r,allowed){
 assert.ok(allowed.includes(r.status),name+' HTTP '+r.status);
 const bytes=Buffer.from(await r.arrayBuffer());
 if(r.status>=400)assert.ok(!bytes.includes(expected)&&!bytes.includes(Buffer.from('PL-SYN-002')),name+' returned package data');
 checks.push({name,http_status:r.status});return bytes;
}
let issuer,recipient,issuanceAttempted=false,withdrawn=false;
try{
 issuer=await login('COLLECTOR');recipient=await login('REVIEWER');
 assert.notEqual(issuer.user,recipient.user);
 await check('anonymous denied',await call('package'),[401]);
 await check('recipient denied before issue',await call('package',recipient.token),[403]);
 await check('recipient cannot issue',await call('issue',recipient.token),[403]);
 issuanceAttempted=true;
 await check('issuer grants package',await call('issue',issuer.token),[201]);
 await check('issuer denied recipient download',await call('package',issuer.token),[403]);
 await check('recipient cannot withdraw',await call('withdraw',recipient.token),[403]);
 const r=await call('package',recipient.token);
 assert.match(r.headers.get('cache-control')||'',/no-store/);
 const bytes=await check('recipient retrieves exact package',r,[200]);
 assert.deepEqual(bytes,expected);receipt.received_sha256=digest(bytes);receipt.size_bytes=bytes.length;
 const direct=BASE+'/storage/v1/object/authenticated/proofline-synthetic-handoffs/'+id+'/'+recipient.user+'/package.json';
 await check('direct private object access denied while issued',await http(direct,{headers:headers(recipient.token)}),[400,401,403,404]);
 await check('issuer withdraws access',await call('withdraw',issuer.token),[200]);withdrawn=true;
 await check('same recipient session denied after withdrawal',await call('package',recipient.token),[403]);
 await check('recipient session still authenticated',await http(BASE+'/auth/v1/user',{headers:headers(recipient.token)}),[200]);
 await check('repeat withdrawal safe',await call('withdraw',issuer.token),[200]);
 await check('withdrawn grant cannot be reissued',await call('issue',issuer.token),[409]);
 await logout(recipient.token);
 recipient=await login('REVIEWER');
 await check('new recipient session denied after withdrawal',await call('package',recipient.token),[403]);
 await check('direct private object denied after withdrawal',await http(direct,{headers:headers(recipient.token)}),[400,401,403,404]);
}finally{
 try{
  if(issuanceAttempted&&!withdrawn){
   const r=await call('withdraw',issuer.token);
   assert.ok([200,409].includes(r.status),'Verify withdrawal after interrupted attempt: '+r.status);
  }
 }finally{
  const cleanup=await Promise.allSettled([...signedIn].map(logout));
  assert.ok(cleanup.every(x=>x.status==='fulfilled'),'Verify Auth session cleanup');
 }
}
receipt.completed_at=new Date().toISOString();
if(env.PROOFLINE_ACCEPTANCE_OUTPUT)await writeFile(env.PROOFLINE_ACCEPTANCE_OUTPUT,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
