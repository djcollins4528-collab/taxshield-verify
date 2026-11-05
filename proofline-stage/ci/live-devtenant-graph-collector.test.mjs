import test from 'node:test';
import assert from 'node:assert/strict';
import {collectLab,validateConfig,LAB_TENANT_ID,LAB_CLIENT_ID} from './live-devtenant-graph-collector.mjs';
const U='44444444-4444-4444-8444-444444444444',R='33333333-3333-4333-8333-333333333333';
const cfg=()=>({tenant_id:LAB_TENANT_ID,client_id:LAB_CLIENT_ID,subject_id:U,subject_upn:'lab-alpha@example.invalid',approved_domain:'example.invalid',departure_at:'2026-11-01T12:00:00Z',cutoff_at:'2026-11-02T12:00:00Z',relationships:[{kind:'group',id:R}],explicit_readonly_authorization:true,synthetic_lab_only:true});
const reply=(data,status=200)=>({status,json:async()=>data});
function fake(opts={}){
 const seen=[];
 const fn=async(url,options)=>{
  seen.push(url);assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.ok(url.startsWith('https://graph.microsoft.com/v1.0/'));
  if(url.includes('/users/'+U+'?'))return reply({id:U,userPrincipalName:'lab-alpha@example.invalid',userType:'Member',accountEnabled:false,onPremisesSyncEnabled:false});
  if(url.includes('/memberOf?'))return reply({value:[{id:R,'@odata.type':'#microsoft.graph.group'}],...(opts.badPage?{'@odata.nextLink':'https://evil.example/steal'}:{})});
  if(url.includes('/appRoleAssignments?'))return reply({value:[]});
  if(url.includes('/auditLogs/directoryAudits?'))return reply({value:[]});
  throw Error('unexpected path');
 };
 return {fn,seen};
}
test('collects exact pinned lab identity with read-only GET calls',async()=>{
 const {fn,seen}=fake();const out=await collectLab(cfg(),'f'.repeat(80),{fetchImpl:fn,now:()=> '2026-11-05T20:00:00Z'});
 assert.equal(out.user.accountEnabled,false);assert.equal(out.relationships[0].observed_present,true);
 assert.equal(out.delivery_approved,false);assert.equal(out.revocation_conclusion,'INCONCLUSIVE_UNTIL_ATTRIBUTABLE_EVENT_REVIEWED');
 assert.equal(seen.length,4);assert.ok(out.source_receipts.length>=4);
});
test('rejects unapproved tenant',()=>assert.throws(()=>validateConfig({...cfg(),tenant_id:U}),/approved lab/));
test('rejects changed application',()=>assert.throws(()=>validateConfig({...cfg(),client_id:U}),/app client/));
test('rejects absent explicit authorization',()=>assert.throws(()=>validateConfig({...cfg(),explicit_readonly_authorization:false}),/authorized test/));
test('rejects more than five relationship IDs',()=>assert.throws(()=>validateConfig({...cfg(),relationships:Array(6).fill({kind:'group',id:R})}),/five/));
test('rejects duplicate relationships',()=>assert.throws(()=>validateConfig({...cfg(),relationships:[{kind:'group',id:R},{kind:'group',id:R}]}),/duplicate/));
test('rejects observation window beyond seven days',()=>assert.throws(()=>validateConfig({...cfg(),cutoff_at:'2026-11-09T12:00:01Z'}),/seven days/));
test('rejects missing token',async()=>assert.rejects(collectLab(cfg(),''),/token/));
test('rejects hostile Graph pagination URL',async()=>assert.rejects(collectLab(cfg(),'f'.repeat(80),{fetchImpl:fake({badPage:true}).fn}),/untrusted URL/));
test('rejects inaccessible Microsoft Graph source',async()=>assert.rejects(collectLab(cfg(),'f'.repeat(80),{fetchImpl:async()=>reply({},403)}),/user GET denied/));
test('rejects wrong pinned identity',async()=>assert.rejects(collectLab(cfg(),'f'.repeat(80),{fetchImpl:async()=>reply({id:R,userPrincipalName:'lab-alpha@example.invalid',userType:'Member'})}),/wrong pinned/));
