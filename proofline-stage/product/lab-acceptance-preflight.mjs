// Preflight only: no network, token handling, or Graph calls.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {validateScope} from './graph-access-collector.mjs';
const file=process.argv[2];
if(!file)throw Error('Usage: node lab-acceptance-preflight.mjs <scope.json>');
const s=JSON.parse(readFileSync(resolve(file),'utf8'));
if(s.tenant_id!=='c3a220f5-0086-484c-ae8c-bf3271ccfc73'||s.subject_id!=='7b1984c6-18eb-4272-b010-0e237c550b40')
 throw Error('LAB_NO_GO: unexpected tenant or user');
if(s.relationships?.length!==1||s.relationships[0]?.kind!=='static_group'||
 s.relationships[0]?.id!=='3d021101-f5c4-4b3d-acb5-f9a490c89fd4')
 throw Error('LAB_NO_GO: unexpected group scope');
if(s.authorized!==true||s.owner_approved!==true){
 console.log('BLOCKED: identity and relationship scope pinned, but authorization flags are not approved. No Graph request performed.');
 process.exitCode=2;
}else{
 const result=validateScope(s);
 console.log('PREFLIGHT_PASS: pinned tenant, user, relationship and approved scope; digest '+result.scope_sha256+'; no Graph request performed.');
}
