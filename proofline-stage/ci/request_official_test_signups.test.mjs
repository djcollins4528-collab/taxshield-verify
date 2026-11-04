import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STAGING,validate,requestConfirmations} from './request_official_test_signups.mjs';
const ENV={
 SUPABASE_URL:STAGING,
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_only_not_real',
 PROOFLINE_COLLECTOR_EMAIL:'proofline-collector-test@example.invalid',
 PROOFLINE_REVIEWER_EMAIL:'proofline-reviewer-test@example.invalid',
 PROOFLINE_COLLECTOR_PASSWORD:'mockCollectorPassword123456',
 PROOFLINE_REVIEWER_PASSWORD:'mockReviewerPassword789012'
};
test('project must be exact staging',()=>assert.throws(()=>validate({...ENV,SUPABASE_URL:'https://wrong.supabase.co'}),/staging/));
test('secret or service key refused',()=>assert.throws(()=>validate({...ENV,SUPABASE_PUBLISHABLE_KEY:'sb_secret_bad'}),/key/));
test('rejects nondedicated addresses',()=>assert.throws(()=>validate({...ENV,PROOFLINE_COLLECTOR_EMAIL:'customer@example.com'}),/(Dedicated|Refusing)/));
test('requires different mailboxes',()=>assert.throws(()=>validate({...ENV,PROOFLINE_REVIEWER_EMAIL:ENV.PROOFLINE_COLLECTOR_EMAIL}),/(Dedicated|Separate|Refusing)/));
test('requires different strong passwords',()=>{
 assert.throws(()=>validate({...ENV,PROOFLINE_COLLECTOR_PASSWORD:'weak'}),/password/);
 assert.throws(()=>validate({...ENV,PROOFLINE_REVIEWER_PASSWORD:ENV.PROOFLINE_COLLECTOR_PASSWORD}),/Separate/);
});
test('requests two confirmations through official signup route without admin key',async()=>{
 const calls=[];const info=[];
 const response=await requestConfirmations(async(url,init)=>{
  calls.push({url,init});
  return {status:200};
 },ENV,s=>info.push(s));
 assert.equal(calls.length,2);assert.equal(info.length,2);
 assert.deepEqual(response,{confirmationRequestsAccepted:2,accountsVerified:false,membershipsCreated:false});
 for(const c of calls){
  assert.equal(c.url,STAGING+'/auth/v1/signup');
  assert.equal(c.init.method,'POST');
  assert.equal(c.init.headers.apikey,ENV.SUPABASE_PUBLISHABLE_KEY);
  const v=JSON.parse(c.init.body);
  assert.match(v.email,/^proofline-(collector|reviewer)-test@/);
  assert.equal(Object.hasOwn(v,'role'),false);
 }
});
test('server refusal does not claim account confirmed',async()=>{
 await assert.rejects(requestConfirmations(async()=>({status:429}),ENV),/state unverified/);
});
test('second signup fails closed without claiming two successes',async()=>{
 let count=0;
 await assert.rejects(requestConfirmations(async()=>({status:++count===1?200:422}),ENV),/state unverified/);
 assert.equal(count,2);
});
test('network failures propagate rather than claim signup',async()=>{
 await assert.rejects(requestConfirmations(async()=>{throw Error('network unavailable')},ENV),/network unavailable/);
});

test('accepts verified owner-linked mailbox alias signup',async()=>{
 const aliased={...ENV,PROOFLINE_OWNER_EMAIL:'sample.owner@gmail.com',
  PROOFLINE_COLLECTOR_EMAIL:'sample.owner+proofline-collector-test@gmail.com',
  PROOFLINE_REVIEWER_EMAIL:'sample.owner+proofline-reviewer-test@gmail.com'};
 const received=[];
 const result=await requestConfirmations(async(_url,config)=>{
  received.push(JSON.parse(config.body).email);return {status:200};
 },aliased);
 assert.equal(result.accountsVerified,false);
 assert.deepEqual(received,[aliased.PROOFLINE_COLLECTOR_EMAIL,aliased.PROOFLINE_REVIEWER_EMAIL]);
});
test('rejects alias signup without proven owner base',async()=>{
 const aliased={...ENV,PROOFLINE_COLLECTOR_EMAIL:'sample.owner+proofline-collector-test@gmail.com',
 PROOFLINE_REVIEWER_EMAIL:'sample.owner+proofline-reviewer-test@gmail.com'};
 let called=0;
 await assert.rejects(requestConfirmations(async()=>{called++;return {status:200}},aliased),/Owner mailbox/);
 assert.equal(called,0);
});
