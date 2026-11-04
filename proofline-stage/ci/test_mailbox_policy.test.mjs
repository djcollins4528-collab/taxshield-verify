import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateTestMailboxes} from './test_mailbox_policy.mjs';
const env={
 PROOFLINE_OWNER_EMAIL:'sample.owner@gmail.com',
 PROOFLINE_COLLECTOR_EMAIL:'sample.owner+proofline-collector-test@gmail.com',
 PROOFLINE_REVIEWER_EMAIL:'sample.owner+proofline-reviewer-test@gmail.com'
};
test('accepts two role-specific aliases of same owner mailbox',()=>{
 const result=validateTestMailboxes(env);
 assert.equal(result.mode,'owner-plus-alias');
});
test('refuses aliases if owner email is absent',()=>assert.throws(()=>validateTestMailboxes({...env,PROOFLINE_OWNER_EMAIL:undefined}),/Owner mailbox/));
test('refuses different owner mailbox',()=>assert.throws(()=>validateTestMailboxes({...env,PROOFLINE_OWNER_EMAIL:'someone.else@gmail.com'}),/Owner mailbox/));
test('refuses role swap',()=>assert.throws(()=>validateTestMailboxes({...env,PROOFLINE_COLLECTOR_EMAIL:env.PROOFLINE_REVIEWER_EMAIL,PROOFLINE_REVIEWER_EMAIL:env.PROOFLINE_COLLECTOR_EMAIL}),/role tag mismatch/));
test('refuses mixed or unrelated accounts',()=>assert.throws(()=>validateTestMailboxes({...env,PROOFLINE_REVIEWER_EMAIL:'customer@example.com'}),/Refusing/));
test('refuses same mailbox for both roles',()=>assert.throws(()=>validateTestMailboxes({...env,PROOFLINE_REVIEWER_EMAIL:env.PROOFLINE_COLLECTOR_EMAIL}),/Distinct/));
test('retains dedicated test account compatibility',()=>{
 const result=validateTestMailboxes({PROOFLINE_COLLECTOR_EMAIL:'proofline-collector-test@example.invalid',PROOFLINE_REVIEWER_EMAIL:'proofline-reviewer-test@example.invalid'});
 assert.equal(result.mode,'dedicated');
});
test('refuses fake plus alias without matching owner base',()=>assert.throws(()=>validateTestMailboxes({...env,PROOFLINE_REVIEWER_EMAIL:'another.owner+proofline-reviewer-test@gmail.com'}),/same owner/));
