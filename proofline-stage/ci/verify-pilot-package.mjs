import {readFile, stat} from 'node:fs/promises';
import {resolve, relative, isAbsolute, sep} from 'node:path';
import {createHash} from 'node:crypto';

const HEX64=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESULTS=new Set(['PASS','FAIL','INCONCLUSIVE','NOT_TESTED','NOT_APPLICABLE']);
const DOCS=['assessment_pdf','evidence_register','remediation_worksheet'];
const REQUIRED=['sign_in_disabled','session_revocation'];
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const string=x=>typeof x==='string'&&x.trim().length>0;
const iso=x=>typeof x==='string'&&!Number.isNaN(Date.parse(x))&&/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(x)&&/(Z|[+-]\d\d:\d\d)$/.test(x);
const fail=(message)=>{throw new Error('PACKAGE_NO_GO: '+message)};
const requireField=(value,name,check=string)=>{if(!check(value))fail(name+' missing/invalid');return value};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const normId=id=>requireField(id,'case_id',x=>UUID.test(x));
const unique=(values,label)=>{if(new Set(values).size!==values.length)fail('duplicate '+label)};
const pathInside=(root,p)=>{
 requireField(p,'artifact path',x=>string(x)&&!isAbsolute(x)&&!x.includes('\\')&&!x.includes('\0')&&!x.split('/').includes('..'));
 const full=resolve(root,p),rel=relative(root,full);
 if(!rel||rel.startsWith('..'+sep)||rel==='..'||isAbsolute(rel))fail('artifact escapes bundle directory');
 return full;
};
function checkFinding(f,caseId,sourceIds,tag){
 if(!isObj(f))fail(tag+' not an object');
 requireField(f.id,tag+'.id');
 requireField(f.control,tag+'.control');
 requireField(f.result,tag+'.result',x=>RESULTS.has(x));
 requireField(f.observed_at,tag+'.observed_at',iso);
 requireField(f.criterion,tag+'.criterion');
 requireField(f.reasoning,tag+'.reasoning');
 requireField(f.case_id,tag+'.case_id',x=>x===caseId);
 if(!Array.isArray(f.evidence_ids))fail(tag+'.evidence_ids missing');
 unique(f.evidence_ids,tag+' evidence ids');
 for(const id of f.evidence_ids)if(!sourceIds.has(id))fail(tag+' references absent evidence '+id);
 if(['PASS','FAIL'].includes(f.result)&&f.evidence_ids.length===0)fail(tag+' result lacks evidence');
 if(f.result==='INCONCLUSIVE'&&!string(f.limitations))fail(tag+' lacks limitations');
 if(f.result==='NOT_APPLICABLE'&&(!string(f.not_applicable_reason)||f.reviewer_concurred!==true))fail(tag+' unreviewed N/A');
}
export async function verifyPackage(manifest,dir){
 if(!isObj(manifest)||manifest.schema_version!==1)fail('unsupported manifest schema');
 if(manifest.synthetic!==true)fail('acceptance verifier only permits synthetic fixtures');
 const caseId=normId(manifest.case_id);
 const phase=requireField(manifest.phase,'phase',x=>['initial','retest'].includes(x));
 requireField(manifest.tenant_id,'tenant_id',x=>UUID.test(x));
 requireField(manifest.subject_id,'subject_id',x=>UUID.test(x));
 requireField(manifest.departure_at,'departure_at',iso);
 requireField(manifest.collection_cutoff_at,'collection_cutoff_at',iso);
 const dep=Date.parse(manifest.departure_at),cut=Date.parse(manifest.collection_cutoff_at);
 if(cut<dep||cut-dep>7*86400000)fail('initial observation window exceeds seven days');
 requireField(manifest.readiness_at,'readiness_at',iso);
 requireField(manifest.report_completed_at,'report_completed_at',iso);
 if(Date.parse(manifest.report_completed_at)<Date.parse(manifest.readiness_at))fail('report timestamp precedes readiness');
 if(manifest.delivery_approved!==false)fail('synthetic delivery must remain locked');
 if(!isObj(manifest.scope)||!Array.isArray(manifest.scope.relationship_ids))fail('missing scope relationships');
 const relationships=manifest.scope.relationship_ids;
 if(relationships.length>5)fail('more than five named relationships');
 for(const id of relationships)requireField(id,'relationship id',x=>UUID.test(x));
 unique(relationships,'relationship IDs');
 if(!isObj(manifest.review))fail('missing reviewer record');
 const review=manifest.review;
 requireField(review.collector_actor_id,'collector actor');
 requireField(review.reviewer_actor_id,'reviewer actor');
 if(review.collector_actor_id===review.reviewer_actor_id)fail('self-review');
 requireField(review.reviewed_at,'reviewed_at',iso);
 if(review.approved!==true)fail('report not approved by reviewer');
 if(review.independent_human_verified!==true)fail('independent human identity not verified');
 requireField(review.independence_receipt_id,'independence receipt');
 requireField(review.reviewed_report_sha256,'reviewed report digest',x=>HEX64.test(x));
 if(!Array.isArray(manifest.evidence)||manifest.evidence.length===0)fail('missing evidence register entries');
 const evidenceIds=new Set();
 for(const e of manifest.evidence){
  if(!isObj(e))fail('invalid evidence entry');
  requireField(e.id,'evidence id');if(evidenceIds.has(e.id))fail('duplicate evidence id');evidenceIds.add(e.id);
  requireField(e.source,'evidence source');requireField(e.collected_at,'evidence collection time',iso);
  requireField(e.sha256,'evidence digest',x=>HEX64.test(x));
  if(Date.parse(e.collected_at)>Date.parse(manifest.report_completed_at))fail('evidence collected after report');
 }
 if(!Array.isArray(manifest.findings))fail('missing findings');
 const findings=manifest.findings;
 for(const f of findings)checkFinding(f,caseId,evidenceIds,'finding '+(f?.id??'?'));
 unique(findings.map(f=>f.id),'finding IDs');
 const controls=findings.map(f=>f.control);
 for(const c of REQUIRED)if(controls.filter(x=>x===c).length!==1)fail('missing or duplicate mandatory control '+c);
 for(const id of relationships)if(controls.filter(x=>x==='relationship:'+id).length!==1)fail('missing or duplicate relationship finding '+id);
 if(findings.length!==2+relationships.length)fail('findings do not match the agreed scope');
 if(!Array.isArray(manifest.remediation))fail('missing remediation worksheet entries');
 const exceptions=findings.filter(f=>['FAIL','INCONCLUSIVE','NOT_TESTED'].includes(f.result));
 for(const f of exceptions){const rows=manifest.remediation.filter(x=>x?.finding_id===f.id);if(rows.length!==1||!string(rows[0].owner_role)||!string(rows[0].action)||!string(rows[0].retest_criterion))fail('incomplete remediation row for '+f.id);}
 unique(manifest.remediation.map(x=>x.finding_id),'remediation finding IDs');
 if(manifest.remediation.some(x=>!findings.some(f=>f.id===x.finding_id)))fail('remediation references unknown finding');
 if(!isObj(manifest.artifacts))fail('missing artifacts map');
 const required=[...DOCS,...(phase==='retest'?['retest_addendum']:[])];
 const actual=Object.keys(manifest.artifacts);
 unique(actual,'artifact keys');
 if(actual.length!==required.length||required.some(k=>!actual.includes(k)))fail('artifact set does not match phase');
 const paths=[];
 for(const key of required){
  const v=manifest.artifacts[key];if(!isObj(v))fail('missing artifact '+key);
  const p=requireField(v.path,key+'.path');paths.push(p);
  requireField(v.sha256,key+'.sha256',x=>HEX64.test(x));
  requireField(v.case_id,key+'.case_id',x=>x===caseId);
  requireField(v.reviewed_version,key+'.reviewed_version',x=>x===manifest.version);
  const file=pathInside(dir,p);const info=await stat(file).catch(()=>fail('missing artifact '+key));
  if(!info.isFile()||info.size===0||info.size>20*1024*1024)fail('invalid artifact size '+key);
  const data=await readFile(file);
  if(digest(data)!==v.sha256)fail('SHA mismatch '+key);
  if(key==='assessment_pdf'&&!(data.subarray(0,5).toString()==='%PDF-'&&data.toString('latin1').includes('%%EOF')))fail('assessment is not a PDF');
  if(key==='assessment_pdf'&&v.sha256!==review.reviewed_report_sha256)fail('reviewed PDF hash mismatch');
 }
 unique(paths,'artifact paths');
 if(phase==='retest'){
  if(!isObj(manifest.retest))fail('missing retest metadata');
  requireField(manifest.retest.original_report_sha256,'original report hash',x=>HEX64.test(x));
  requireField(manifest.retest.observed_at,'retest observed time',iso);
  if(Date.parse(manifest.retest.observed_at)<=cut)fail('retest does not preserve original observation window');
  if(manifest.retest.original_report_sha256===manifest.artifacts.assessment_pdf.sha256)fail('retest overwrites original report');
 }else if(manifest.retest!==undefined)fail('unexpected retest metadata');
 return {status:'PACKAGE_CONTRACT_PASS',case_id:caseId,phase,artifact_count:required.length,findings:findings.length,delivery_approved:false,independence_note:'attestation fields require external human verification'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+resolve(process.argv[1])).href){
 try{
  const file=process.argv[2];if(!file)fail('usage: node verify-pilot-package.mjs manifest.json');
  const data=JSON.parse(await readFile(file,'utf8'));
  console.log(JSON.stringify(await verifyPackage(data,resolve(file,'..'))));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
