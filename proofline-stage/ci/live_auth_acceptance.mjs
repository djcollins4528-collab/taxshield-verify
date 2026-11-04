import {validateTestMailboxes} from './test_mailbox_policy.mjs';
// Dependency-free, staging-only Auth acceptance. Never provision users or log credentials.
export const BASE='https://pgknyzwctmfqvlivlgpe.supabase.co';
export const TENANT='bbbbaaaa-1111-4111-8111-000000000001';
const OTHER='ccccaaaa-2222-4222-8222-000000000002';
export function validate(env) {
 const required=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','PROOFLINE_COLLECTOR_EMAIL','PROOFLINE_COLLECTOR_PASSWORD','PROOFLINE_REVIEWER_EMAIL','PROOFLINE_REVIEWER_PASSWORD'];
 for(const key of required)if(!env[key])throw Error('Missing required test-only configuration: '+key);
 if(env.SUPABASE_URL!==BASE)throw Error('Refusing nonstaging project');
 if(env.SUPABASE_PUBLISHABLE_KEY.length<16)throw Error('Missing publishable key');
 validateTestMailboxes(env);
 if(env.PROOFLINE_COLLECTOR_EMAIL.toLowerCase()===env.PROOFLINE_REVIEWER_EMAIL.toLowerCase()||env.PROOFLINE_COLLECTOR_PASSWORD===env.PROOFLINE_REVIEWER_PASSWORD)throw Error('Distinct Auth accounts and passwords required');
 return env;
}
async function call(fetcher,env,path,{method='GET',token,body}={}) {
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try {
  const headers={apikey:env.SUPABASE_PUBLISHABLE_KEY,accept:'application/json'};
  if(token)headers.authorization='Bearer '+token;
  if(body)headers['content-type']='application/json';
  return await fetcher(BASE+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:controller.signal,redirect:'error'});
 }finally{clearTimeout(timeout)}
}
async function signIn(fetcher,env,email,password) {
 const r=await call(fetcher,env,'/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
 if(r.status!==200)throw Error('Official Supabase test sign-in denied (HTTP '+r.status+')');
 const b=await r.json();
 if(!b?.access_token||!b?.user?.id||b.user.is_anonymous)throw Error('No valid nonanonymous Auth session');
 return {token:b.access_token,userId:b.user.id,revoked:false};
}
async function check(fetcher,env,token,tenant,role) {
 const params=new URLSearchParams({tenant,role});
 return (await call(fetcher,env,'/functions/v1/proofline-staging-auth/check?'+params,{token})).status;
}
async function signOut(fetcher,env,token) {
 const r=await call(fetcher,env,'/auth/v1/logout?scope=local',{method:'POST',token});
 if(![200,204].includes(r.status))throw Error('Test logout failed (HTTP '+r.status+')');
}
export async function run(fetcher,env,report=()=>{}) {
 validate(env);const sessions=[];
 const assert=(name,got,expected)=>{if(got!==expected)throw Error(name+' expected '+expected+' received '+got);report(name)};
 try{
  const a=await signIn(fetcher,env,env.PROOFLINE_COLLECTOR_EMAIL,env.PROOFLINE_COLLECTOR_PASSWORD);sessions.push(a);
  const b=await signIn(fetcher,env,env.PROOFLINE_REVIEWER_EMAIL,env.PROOFLINE_REVIEWER_PASSWORD);sessions.push(b);
  if(a.userId===b.userId)throw Error('Two independent Auth user IDs required');
  assert('collector authorized',await check(fetcher,env,a.token,TENANT,'collector'),200);
  assert('collector cannot review',await check(fetcher,env,a.token,TENANT,'reviewer'),403);
  assert('reviewer authorized',await check(fetcher,env,b.token,TENANT,'reviewer'),200);
  assert('reviewer cannot collect',await check(fetcher,env,b.token,TENANT,'collector'),403);
  assert('collector cross-tenant denied',await check(fetcher,env,a.token,OTHER,'collector'),403);
  assert('reviewer cross-tenant denied',await check(fetcher,env,b.token,OTHER,'reviewer'),403);
  await signOut(fetcher,env,a.token);a.revoked=true;
  const revokedA=await check(fetcher,env,a.token,TENANT,'collector');
  if(![401,403].includes(revokedA))throw Error('Revoked collector session accepted or service unavailable: '+revokedA);
  report('collector revoked');
  assert('reviewer unaffected',await check(fetcher,env,b.token,TENANT,'reviewer'),200);
  await signOut(fetcher,env,b.token);b.revoked=true;
  const revokedB=await check(fetcher,env,b.token,TENANT,'reviewer');
  if(![401,403].includes(revokedB))throw Error('Revoked reviewer session accepted or service unavailable: '+revokedB);
  report('reviewer revoked');
  return {passed:9};
 }finally{
  for(const s of sessions.filter(s=>!s.revoked))try{await signOut(fetcher,env,s.token)}catch{/* never log tokens */}
 }
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href) {
 try{const result=await run(fetch,process.env,name=>console.log('PASS: '+name));console.log('PASSED '+result.passed+' live Auth acceptance checks');}
 catch(e){console.error('FAIL: '+e.message);process.exitCode=1}
}
