import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BASE,TENANT,validate,run} from './live_auth_acceptance.mjs';
const env={
 SUPABASE_URL:BASE,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_mock_only',
 PROOFLINE_COLLECTOR_EMAIL:'proofline-collector-test@example.invalid',
 PROOFLINE_COLLECTOR_PASSWORD:'secret-one-placeholder',
 PROOFLINE_REVIEWER_EMAIL:'proofline-reviewer-test@example.invalid',
 PROOFLINE_REVIEWER_PASSWORD:'secret-two-placeholder'
};
function fake({revocationBroken=false,missingMembership=false,duplicateUser=false,roleEscalation=false}={}) {
 const revoked=new Set(),history=[];
 async function request(url,options) {
  const u=new URL(url),path=u.pathname;history.push(path);
  if(path==='/auth/v1/token'){
   const role=JSON.parse(options.body).email.includes('collector')?'collector':'reviewer';
   return {status:200,json:async()=>({access_token:'test-'+role,user:{id:duplicateUser?'same-id':'id-'+role,is_anonymous:false}})};
  }
  const role=options.headers.authorization.includes('collector')?'collector':'reviewer';
  if(path==='/auth/v1/logout'){revoked.add(role);return {status:204}}
  if(path.endsWith('/check')){
   if(u.searchParams.get('tenant')!==TENANT)return {status:403};
   if(revoked.has(role)&&!revocationBroken)return {status:401};
   if(missingMembership)return {status:403};
   if(role===u.searchParams.get('role')||(roleEscalation&&role==='collector'))return {status:200};
   return {status:403};
  }
  throw Error('Unexpected mock route');
 }
 return {request,revoked,history};
}
test('fails closed on incorrect project',()=>assert.throws(()=>validate({...env,SUPABASE_URL:'https://wrong.supabase.co'})));
test('fails closed on missing credentials',()=>assert.throws(()=>validate({...env,PROOFLINE_REVIEWER_PASSWORD:''})));
test('fails closed on non-test accounts',()=>assert.throws(()=>validate({...env,PROOFLINE_COLLECTOR_EMAIL:'real@example.com'})));
test('fails closed on shared Auth account or password',()=>{
 assert.throws(()=>validate({...env,PROOFLINE_REVIEWER_EMAIL:env.PROOFLINE_COLLECTOR_EMAIL}));
 assert.throws(()=>validate({...env,PROOFLINE_REVIEWER_PASSWORD:env.PROOFLINE_COLLECTOR_PASSWORD}));
});
test('positive/negative permissions, cross-tenant and revocation',async()=>{
 const m=fake();const checks=[];
 const result=await run(m.request,env,s=>checks.push(s));
 assert.equal(result.passed,9);
 assert.equal(checks.length,9);
 assert.deepEqual([...m.revoked].sort(),['collector','reviewer']);
});
test('denies when memberships have not been provisioned',async()=>{
 const m=fake({missingMembership:true});
 await assert.rejects(run(m.request,env),/collector authorized/);
 assert.deepEqual([...m.revoked].sort(),['collector','reviewer']);
});
test('rejects two accounts with same Auth user ID',async()=>{
 const m=fake({duplicateUser:true});
 await assert.rejects(run(m.request,env),/independent Auth/);
 assert.deepEqual([...m.revoked].sort(),['collector','reviewer']);
});
test('detects collector role escalation and logs out',async()=>{
 const m=fake({roleEscalation:true});
 await assert.rejects(run(m.request,env),/collector cannot review/);
 assert.deepEqual([...m.revoked].sort(),['collector','reviewer']);
});
test('detects when revoked session stays authorized',async()=>{
 const m=fake({revocationBroken:true});
 await assert.rejects(run(m.request,env),/Revoked collector session accepted/);
 assert.deepEqual([...m.revoked].sort(),['collector','reviewer']);
});
