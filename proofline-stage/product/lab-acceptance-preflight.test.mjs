import test from 'node:test';
import assert from 'node:assert/strict';
import {validateScope} from './graph-access-collector.mjs';
const s=()=>({authorized:false,owner_approved:false,read_only:true,tenant_id:'c3a220f5-0086-484c-ae8c-bf3271ccfc73',subject_id:'7b1984c6-18eb-4272-b010-0e237c550b40',relationships:[{kind:'static_group',id:'3d021101-f5c4-4b3d-acb5-f9a490c89fd4'}]});
test('lab acceptance fixture is blocked before authorization',()=>assert.throws(()=>validateScope(s()),/owner-authorized/));
test('authorized pinned lab scope is accepted by validator',()=>{const x=s();x.authorized=true;x.owner_approved=true;assert.match(validateScope(x).scope_sha256,/^[0-9a-f]{64}$/)});
test('scope expansion to unrelated group remains explicit and detectable',()=>{const x=s();x.authorized=true;x.owner_approved=true;const first=validateScope(x).scope_sha256;x.relationships.push({kind:'static_group',id:'11111111-1111-4111-8111-111111111111'});assert.notEqual(validateScope(x).scope_sha256,first)});
