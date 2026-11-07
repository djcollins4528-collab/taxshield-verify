import test from 'node:test';
import assert from 'node:assert/strict';
import {collectAccessAssurance} from './graph-access-collector.mjs';
import {buildInternalReviewPacket,verifyInternalReviewPacket} from './graph-review-packet.mjs';
const t='c3a220f5-0086-484c-ae8c-bf3271ccfc73',u='7b1984c6-18eb-4272-b010-0e237c550b40',g='3d021101-f5c4-4b3d-acb5-f9a490c89fd4';
const scope=()=>({authorized:true,owner_approved:true,read_only:true,tenant_id:t,subject_id:u,relationships:[{kind:'static_group',id:g}]});
const transport=async url=>{
 const p=new URL(url).pathname;
 if(p==='/v1.0/organization')return {value:[{id:t}]};
 if(p==='/v1.0/users/'+u)return {id:u,accountEnabled:false,userType:'Member'};
 if(p.endsWith('/microsoft.graph.group'))return {value:[{id:g,groupTypes:[],securityEnabled:true}]};
 throw Error('unexpected endpoint '+url);
};
test('collector output builds a reproducible internal review packet',async()=>{
 const e=await collectAccessAssurance(scope(),transport);
 const a=buildInternalReviewPacket(e,scope()),b=buildInternalReviewPacket(e,scope());
 assert.deepEqual(a,b);
 assert.equal(verifyInternalReviewPacket(a).verified,true);
 assert.equal(JSON.parse(a['assessment.json']).findings[0].observed_direct_assignment,'PRESENT');
 assert.equal(JSON.parse(a['assessment.json']).customer_ready,false);
});
test('tampering with normalized Graph result is rejected',async()=>{
 const e=await collectAccessAssurance(scope(),transport);
 e.observed_relationships=[];
 assert.throws(()=>buildInternalReviewPacket(e,scope()),/source digest mismatch/);
});
test('tampering with approved scope is rejected',async()=>{
 const e=await collectAccessAssurance(scope(),transport),s=scope();
 s.relationships[0].id='11111111-1111-4111-8111-111111111111';
 assert.throws(()=>buildInternalReviewPacket(e,s),/scope mismatch/);
});
test('tenant mismatch is rejected',async()=>{
 const e=await collectAccessAssurance(scope(),transport),s=scope();
 s.tenant_id='11111111-1111-4111-8111-111111111111';
 assert.throws(()=>buildInternalReviewPacket(e,s),/tenant or subject mismatch/);
});
test('source completeness is mandatory',async()=>{
 const e=await collectAccessAssurance(scope(),transport);
 e.source.pagination_complete=false;
 assert.throws(()=>buildInternalReviewPacket(e,scope()),/missing source provenance/);
});
test('report tampering is detected',async()=>{
 const e=await collectAccessAssurance(scope(),transport),p=buildInternalReviewPacket(e,scope());
 p['report.md']+='malicious amendment';
 assert.throws(()=>verifyInternalReviewPacket(p),/tampered/);
});
test('fabricated approval is rejected',async()=>{
 const e=await collectAccessAssurance(scope(),transport),p=buildInternalReviewPacket(e,scope());
 const a=JSON.parse(p['assessment.json']);a.review_status='APPROVED';p['assessment.json']=JSON.stringify(a);
 assert.throws(()=>verifyInternalReviewPacket(p),/unsafe approval/);
});
test('synthetic evaluator output cannot enter real packet path',()=>{
 assert.throws(()=>buildInternalReviewPacket({synthetic:true},scope()),/not collector output/);
});
