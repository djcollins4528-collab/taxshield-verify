import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPackage,verifyPackage} from './deliverable-package.mjs';
const tid='c3a220f5-0086-484c-ae8c-bf3271ccfc73',uid='7b1984c6-18eb-4272-b010-0e237c550b40',gid='3d021101-f5c4-4b3d-acb5-f9a490c89fd4';
const snapshot=()=>({synthetic:true,tenant_id:tid,subject_id:uid,observed_at:'2026-11-06T18:00:00Z',source:{sha256:'a'.repeat(64),evidence_id:'SYNTHETIC-S1',collected_at:'2026-11-06T17:59:00Z',pagination_complete:true,permissions_complete:true},scoped_relationships:[{kind:'static_group',id:gid}],observed_relationships:[{kind:'static_group',id:gid}]});
test('deterministic assessment package verifies and remains unreleased',()=>{
 const a=buildPackage({kind:'assessment',synthetic:true,snapshot:snapshot()});
 const b=buildPackage({kind:'assessment',synthetic:true,snapshot:snapshot()});
 assert.deepEqual(a,b);assert.equal(verifyPackage(a).status,'SYNTHETIC_UNREVIEWED');
 assert.match(a['report.md'],/NOT INDEPENDENTLY REVIEWED/);
});
test('drift package verifies and labels human review needed',()=>{
 const a=snapshot(),b=snapshot();b.observed_at='2026-11-07T18:00:00Z';b.source.collected_at='2026-11-07T17:59:00Z';b.observed_relationships=[];
 const pkg=buildPackage({kind:'drift',synthetic:true,before:a,after:b});
 assert.equal(verifyPackage(pkg).verified,true);
 assert.equal(JSON.parse(pkg['assessment.json']).result.human_review_required,true);
});
test('modified report fails verification',()=>{
 const p=buildPackage({kind:'assessment',synthetic:true,snapshot:snapshot()});
 p['report.md']+='modified';assert.throws(()=>verifyPackage(p),/tampered/);
});
test('modified structured assessment fails verification',()=>{
 const p=buildPackage({kind:'assessment',synthetic:true,snapshot:snapshot()});
 p['assessment.json']=p['assessment.json'].replace('NOT_REVIEWED','APPROVED');assert.throws(()=>verifyPackage(p),/unsafe status|tampered/);
});
test('rejects fabricated independent approval',()=>{
 assert.throws(()=>buildPackage({kind:'assessment',synthetic:true,snapshot:snapshot(),reviewer_approved:true}),/cannot assert/);
});
test('rejects non-synthetic inputs',()=>{
 assert.throws(()=>buildPackage({kind:'assessment',synthetic:false,snapshot:snapshot()}),/synthetic/);
});
test('rejects incomplete Graph-like source fixture',()=>{
 const s=snapshot();s.source.pagination_complete=false;
 assert.throws(()=>buildPackage({kind:'assessment',synthetic:true,snapshot:s}),/incomplete/);
});
