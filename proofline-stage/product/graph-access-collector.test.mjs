import test from 'node:test';
import assert from 'node:assert/strict';
import {collectAccessAssurance,validateScope} from './graph-access-collector.mjs';
const t='c3a220f5-0086-484c-ae8c-bf3271ccfc73',u='7b1984c6-18eb-4272-b010-0e237c550b40',g='3d021101-f5c4-4b3d-acb5-f9a490c89fd4',a='11111111-1111-4111-8111-111111111111',role='22222222-2222-4222-8222-222222222222';
const scope=()=>({authorized:true,owner_approved:true,read_only:true,tenant_id:t,subject_id:u,relationships:[{kind:'static_group',id:g},{kind:'enterprise_app_assignment',id:a},{kind:'directory_role',id:role}]});
const transport=async url=>{
 const x=new URL(url);
 if(x.pathname==='/v1.0/organization')return {value:[{id:t,displayName:'Proofline Lab'}]};
 if(x.pathname==='/v1.0/users/'+u)return {id:u,accountEnabled:false,userType:'Member'};
 if(x.pathname.endsWith('/microsoft.graph.group'))return {value:[{id:g,groupTypes:[],securityEnabled:true}]};
 if(x.pathname.endsWith('/appRoleAssignments'))return {value:[{id:'33333333-3333-4333-8333-333333333333',resourceId:a,appRoleId:'00000000-0000-0000-0000-000000000000'}]};
 if(x.pathname.endsWith('/roleAssignments'))return {value:[{id:'44444444-4444-4444-8444-444444444444',principalId:u,roleDefinitionId:role}]};
 throw Error('unexpected URL '+url);
};
test('collects only approved direct relationships and binds tenant/subject',async()=>{
 const x=await collectAccessAssurance(scope(),transport);
 assert.equal(x.source_type,'MICROSOFT_GRAPH_LIVE_READ_ONLY');
 assert.equal(x.observed_relationships.length,3);
 assert.equal(x.source.pagination_complete,true);
 assert.equal(x.account_enabled,false);
});
test('rejects missing authorization',()=>{const s=scope();s.owner_approved=false;assert.throws(()=>validateScope(s),/owner-authorized/)});
test('rejects wrong tenant',async()=>{await assert.rejects(collectAccessAssurance(scope(),async url=>url.includes('organization')?{value:[{id:a}]}:transport(url)),/tenant mismatch/)});
test('rejects missing permissions or transport errors',async()=>{await assert.rejects(collectAccessAssurance(scope(),async()=>{throw Error('403')}),/permissions insufficient/)});
test('rejects incomplete paginated response',async()=>{await assert.rejects(collectAccessAssurance(scope(),async url=>url.includes('organization')?{value:[{id:t}],'@odata.nextLink':'https://evil.example/v1.0/organization'}:transport(url)),/host or version/)});
test('rejects malformed Graph pages',async()=>{await assert.rejects(collectAccessAssurance(scope(),async url=>url.includes('organization')?{}:transport(url)),/malformed/)});
test('rejects dynamic membership scope',()=>{const s=scope();s.relationships[0].membership_type='dynamic';assert.throws(()=>validateScope(s),/dynamic/)});
test('rejects scope duplication',()=>{const s=scope();s.relationships.push({...s.relationships[0]});assert.throws(()=>validateScope(s),/duplicate/)});
