import test from 'node:test';
import assert from 'node:assert/strict';
import {assessSnapshot,compareSnapshots} from './synthetic-access-evaluator.mjs';
const tid='c3a220f5-0086-484c-ae8c-bf3271ccfc73',uid='7b1984c6-18eb-4272-b010-0e237c550b40',gid='3d021101-f5c4-4b3d-acb5-f9a490c89fd4';
const scope=[{kind:'static_group',id:gid}];
const sample=()=>({synthetic:true,tenant_id:tid,subject_id:uid,observed_at:'2026-11-06T18:00:00Z',
source:{sha256:'a'.repeat(64),evidence_id:'S1',collected_at:'2026-11-06T17:59:00Z',pagination_complete:true,permissions_complete:true},
scoped_relationships:scope,observed_relationships:[...scope]});
test('retained group is present, but business need remains unproven',()=>{
 const result=assessSnapshot(sample());assert.equal(result.findings[0].presence,'PRESENT');assert.equal(result.findings[0].business_need,'NOT_ESTABLISHED');assert.equal(result.findings[0].requires_owner_review,true);
});
test('owner justification is an attestation, never proof',()=>{
 const x=sample();x.owner_justifications={['static_group:'+gid]:{attested:true}};assert.equal(assessSnapshot(x).findings[0].business_need,'OWNER_ATTESTED_NOT_INDEPENDENTLY_PROVEN');
});
test('complete absence is bounded to named relationship',()=>{
 const x=sample();x.observed_relationships=[];const r=assessSnapshot(x);assert.equal(r.findings[0].presence,'ABSENT');assert.match(r.coverage,/NAMED_DIRECT/);
});
test('incomplete pages fail closed',()=>{
 const x=sample();x.source.pagination_complete=false;assert.throws(()=>assessSnapshot(x),/incomplete/);
});
test('real-data marker is blocked by prototype',()=>{
 const x=sample();x.synthetic=false;assert.throws(()=>assessSnapshot(x),/synthetic/);
});
test('unsupported dynamic group fails closed',()=>{
 const x=sample();x.scoped_relationships=[{kind:'static_group',id:gid,membership_type:'dynamic'}];assert.throws(()=>assessSnapshot(x),/dynamic/);
});
test('drift reports removed scoped membership, requires human review',()=>{
 const a=sample(),b=sample();b.observed_at='2026-11-07T18:00:00Z';b.source.collected_at='2026-11-07T17:59:00Z';b.observed_relationships=[];
 const result=compareSnapshots(a,b);assert.equal(result.changes[0].state,'REMOVED');assert.equal(result.human_review_required,true);
});
test('cross-tenant snapshot fails closed',()=>{
 const a=sample(),b=sample();b.tenant_id='22222222-2222-4222-8222-222222222222';b.observed_at='2026-11-07T18:00:00Z';b.source.collected_at='2026-11-07T17:59:00Z';assert.throws(()=>compareSnapshots(a,b),/cross-tenant/);
});
