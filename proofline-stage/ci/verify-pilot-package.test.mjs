import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {verifyPackage} from './verify-pilot-package.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const caseId='11111111-1111-4111-8111-111111111111';
const rel='33333333-3333-4333-8333-333333333333';
async function setup(){
 const dir=await mkdtemp(join(tmpdir(),'proofline-contract-'));
 const sources={assessment_pdf:Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n'),evidence_register:Buffer.from('fixture evidence register\n'),remediation_worksheet:Buffer.from('fixture remediation worksheet\n')};
 const artifacts={};for(const [key,value] of Object.entries(sources)){const path=key+'.'+(key==='assessment_pdf'?'pdf':'txt');await writeFile(join(dir,path),value);artifacts[key]={path,sha256:sha(value),case_id:caseId,reviewed_version:'1.0'};}
 const manifest={schema_version:1,synthetic:true,case_id:caseId,phase:'initial',version:'1.0',tenant_id:'22222222-2222-4222-8222-222222222222',subject_id:'44444444-4444-4444-8444-444444444444',departure_at:'2026-11-01T12:00:00Z',collection_cutoff_at:'2026-11-02T12:00:00Z',readiness_at:'2026-11-02T13:00:00Z',report_completed_at:'2026-11-03T13:00:00Z',delivery_approved:false,scope:{relationship_ids:[rel]},review:{collector_actor_id:'collector-a',reviewer_actor_id:'reviewer-b',reviewed_at:'2026-11-03T12:30:00Z',approved:true,independent_human_verified:true,independence_receipt_id:'external-verified-test',reviewed_report_sha256:artifacts.assessment_pdf.sha256},evidence:[{id:'S1',source:'Graph user state',collected_at:'2026-11-02T12:00:00Z',sha256:sha('source1')},{id:'S2',source:'Entra audit logs',collected_at:'2026-11-02T12:00:00Z',sha256:sha('source2')}],findings:[{id:'F1',case_id:caseId,control:'sign_in_disabled',result:'PASS',observed_at:'2026-11-02T12:00:00Z',criterion:'disabled',reasoning:'user state disabled',evidence_ids:['S1']},{id:'F2',case_id:caseId,control:'session_revocation',result:'INCONCLUSIVE',observed_at:'2026-11-02T12:00:00Z',criterion:'revoked',reasoning:'no attributable record',limitations:'audit event missing',evidence_ids:[]},{id:'F3',case_id:caseId,control:'relationship:'+rel,result:'FAIL',observed_at:'2026-11-02T12:00:00Z',criterion:'not a member',reasoning:'still a member',evidence_ids:['S2']}],remediation:[{finding_id:'F2',owner_role:'customer admin',action:'supply attributable record',retest_criterion:'confirmed revocation'},{finding_id:'F3',owner_role:'customer admin',action:'remove membership',retest_criterion:'no direct membership'}],artifacts};
 return {dir,manifest};
}
async function scenario(name,mutate,expected){test(name,async()=>{const {dir,manifest}=await setup();try{await mutate(manifest,dir);if(expected)await assert.rejects(verifyPackage(manifest,dir),new RegExp(expected));else assert.equal((await verifyPackage(manifest,dir)).status,'PACKAGE_CONTRACT_PASS');}finally{await rm(dir,{recursive:true,force:true});}})}
await scenario('accepts internally consistent synthetic initial package',async()=>{});
await scenario('rejects missing PDF',async m=>{delete m.artifacts.assessment_pdf},'artifact set');
await scenario('rejects modified PDF',async (m,d)=>{await writeFile(join(d,m.artifacts.assessment_pdf.path),'tampered')},'SHA mismatch');
await scenario('rejects reviewer self-approval',async m=>{m.review.reviewer_actor_id=m.review.collector_actor_id},'self-review');
await scenario('rejects unverified independent human',async m=>{m.review.independent_human_verified=false},'independent human');
await scenario('rejects unlocked synthetic delivery',async m=>{m.delivery_approved=true},'delivery must remain locked');
await scenario('rejects missing mandatory control',async m=>{m.findings=m.findings.filter(f=>f.id!=='F2')},'mandatory control');
await scenario('rejects incomplete remediation',async m=>{m.remediation=[]},'incomplete remediation');
await scenario('rejects evidence reference without source',async m=>{m.findings[0].evidence_ids=['missing']},'absent evidence');
await scenario('rejects scope creep beyond five',async m=>{m.scope.relationship_ids=Array.from({length:6},(_,i)=>'33333333-3333-4333-8333-33333333333'+i)},'more than five');
await scenario('rejects artifact path traversal',async m=>{m.artifacts.assessment_pdf.path='../outside.pdf'},'artifact path');
await scenario('rejects contradictory reviewer PDF hash',async m=>{m.review.reviewed_report_sha256='0'.repeat(64)},'reviewed PDF hash');
await scenario('rejects absent retest addendum',async m=>{m.phase='retest';m.retest={original_report_sha256:'a'.repeat(64),observed_at:'2026-11-04T12:00:00Z'}},'artifact set');
await scenario('accepts synthetic retest preserving original report',async (m,d)=>{m.phase='retest';m.retest={original_report_sha256:'a'.repeat(64),observed_at:'2026-11-04T12:00:00Z'};const content=Buffer.from('retest addendum\n'),path='retest.txt';await writeFile(join(d,path),content);m.artifacts.retest_addendum={path,sha256:sha(content),case_id:caseId,reviewed_version:m.version}},null);
