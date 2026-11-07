// Internal review packet from a *locally supplied* Graph collector output.
// Not a cryptographic Microsoft attestation or independently approved customer report.
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const sha=x=>createHash('sha256').update(x).digest('hex');
const stable=x=>JSON.stringify(x,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v,2)+'\n';
const fail=m=>{throw Error('REVIEW_PACKET_NO_GO: '+m)};
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const HASH=/^[a-f0-9]{64}$/i;
const kinds=new Set(['static_group','directory_role','enterprise_app_assignment']);
const key=r=>r.kind+':'+r.id.toLowerCase();
const validTime=x=>typeof x==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(x)&&Number.isFinite(Date.parse(x));
export function validateCollectedEvidence(e,expected){
 if(!e||e.synthetic!==false||e.source_type!=='MICROSOFT_GRAPH_LIVE_READ_ONLY'||e.schema_version!==1)fail('not collector output');
 if(!expected||expected.owner_approved!==true||expected.authorized!==true||expected.read_only!==true)fail('approved scope required');
 if(!UUID.test(e.tenant_id||'')||!UUID.test(e.subject_id||'')||
    e.tenant_id.toLowerCase()!==expected.tenant_id?.toLowerCase()||
    e.subject_id.toLowerCase()!==expected.subject_id?.toLowerCase())fail('tenant or subject mismatch');
 if(!Array.isArray(e.scoped_relationships)||e.scoped_relationships.length<1||e.scoped_relationships.length>50||
    !Array.isArray(e.observed_relationships))fail('invalid relationship arrays');
 if(!Array.isArray(expected.relationships)||expected.relationships.length!==e.scoped_relationships.length)fail('scope count mismatch');
 for(const r of [...e.scoped_relationships,...e.observed_relationships,...expected.relationships]){
  if(!r||!kinds.has(r.kind)||!UUID.test(r.id||''))fail('invalid relationship');
 }
 const expectedKeys=expected.relationships.map(key).sort(),scopeKeys=e.scoped_relationships.map(key).sort(),seen=e.observed_relationships.map(key);
 if(new Set(scopeKeys).size!==scopeKeys.length||new Set(seen).size!==seen.length||
    expectedKeys.join('|')!==scopeKeys.join('|')||seen.some(k=>!scopeKeys.includes(k)))fail('scope mismatch or duplicate');
 if(e.scoped_relationships.some(r=>r.kind==='static_group'&&r.membership_type==='dynamic'))fail('dynamic group not supported');
 if(!HASH.test(e.scope_sha256||'')||!HASH.test(e.source?.sha256||'')||
    e.source.pagination_complete!==true||e.source.permissions_complete!==true||
    e.source.graph_api!=='v1.0'||typeof e.source.evidence_id!=='string'||
    !e.source.evidence_id.startsWith('GRAPH-'))fail('missing source provenance');
 if(!validTime(e.observed_at)||!validTime(e.source.collected_at)||
    e.observed_at!==e.source.collected_at)fail('observation timestamp mismatch');
 if(typeof e.account_enabled!=='boolean')fail('missing account state');
 const digest=x=>sha(JSON.stringify(x));
 const scopeDigest=digest({tenant:e.tenant_id.toLowerCase(),subject:e.subject_id.toLowerCase(),relationships:scopeKeys});
 if(scopeDigest!==e.scope_sha256)fail('scope digest mismatch');
 const sourceDigest=digest({tenant:e.tenant_id,subject:e.subject_id,scoped:e.scoped_relationships,
  observed:e.observed_relationships,user:{id:e.subject_id,accountEnabled:e.account_enabled,userType:e.subject_type}});
 // Current collector hashes the raw selected user response; compare against that precise field subset.
 if(sourceDigest!==e.source.sha256)fail('source digest mismatch');
 return true;
}
export function buildInternalReviewPacket(e,approvedScope){
 validateCollectedEvidence(e,approvedScope);
 const observed=new Set(e.observed_relationships.map(key));
 const findings=e.scoped_relationships.map(r=>({
  relationship_kind:r.kind,relationship_id:r.id,
  observed_direct_assignment:observed.has(key(r))?'PRESENT':'NOT_OBSERVED_IN_BOUNDED_SOURCE',
  business_justification:'NOT_ESTABLISHED',
  disposition:'REQUIRES_HUMAN_REVIEW',
  source_evidence_id:e.source.evidence_id,observed_at:e.observed_at
 }));
 const result={schema_version:1,classification:'INTERNAL UNREVIEWED GRAPH COLLECTOR OUTPUT — NOT CUSTOMER READY',
  tenant_id:e.tenant_id,subject_id:e.subject_id,observed_at:e.observed_at,scope_sha256:e.scope_sha256,
  source_sha256:e.source.sha256,source_evidence_id:e.source.evidence_id,
  account_enabled:e.account_enabled,findings,review_status:'NOT_REVIEWED',delivery_status:'NOT_DELIVERED',
  customer_ready:false,limitations:[
   'Collector output and hashes are self-reported, not independently authenticated Microsoft evidence',
   'No business justification established by directory assignments',
   'No indirect, dynamic, PIM eligible, application-role-specific, or tenant-wide effective access conclusions',
   'Absence means not observed only within the bounded authorized source at collection time',
   'Independent reviewer has not verified or approved these observations'
  ]};
 const report='# Proofline Access Assurance — Internal review draft\n\n'+
  '**UNREVIEWED · NOT A CUSTOMER REPORT · NOT DELIVERED**\n\n'+
  'Tenant: '+e.tenant_id+'\n\nSubject: '+e.subject_id+'\n\nObserved: '+e.observed_at+
  '\n\nAccount enabled: '+e.account_enabled+'\n\n'+
  '## Named direct relationships\n\n'+
  findings.map(f=>'- '+f.relationship_kind+' / '+f.relationship_id+': '+f.observed_direct_assignment+'; justification NOT ESTABLISHED').join('\n')+
  '\n\n## Evidence reference\n\nCollector evidence ID: '+e.source.evidence_id+
  '\n\nSource digest: '+e.source.sha256+'\n\nScope digest: '+e.scope_sha256+
  '\n\n## Limitations\n\n'+result.limitations.map(x=>'- '+x).join('\n')+
  '\n\n## Approval\n\nNo independent reviewer signoff; do not distribute to customers.\n';
 const files={'assessment.json':stable(result),'report.md':report};
 const manifest={schema_version:1,classification:result.classification,review_status:'NOT_REVIEWED',
  delivery_status:'NOT_DELIVERED',files:Object.fromEntries(Object.entries(files).map(([name,data])=>[name,{sha256:sha(data),size_bytes:Buffer.byteLength(data)}]))};
 return {...files,'manifest.json':stable(manifest)};
}
export function verifyInternalReviewPacket(files){
 const names=['assessment.json','report.md','manifest.json'];
 if(!files||names.some(n=>typeof files[n]!=='string'))fail('missing packet file');
 const m=JSON.parse(files['manifest.json']),a=JSON.parse(files['assessment.json']);
 if(m.review_status!=='NOT_REVIEWED'||m.delivery_status!=='NOT_DELIVERED'||
    a.review_status!=='NOT_REVIEWED'||a.delivery_status!=='NOT_DELIVERED'||a.customer_ready!==false||
    !a.classification.includes('INTERNAL UNREVIEWED')||!files['report.md'].includes('NOT A CUSTOMER REPORT'))
   fail('unsafe approval or delivery claim');
 if(Object.keys(m.files||{}).sort().join('|')!=='assessment.json|report.md')fail('unexpected files');
 for(const n of ['assessment.json','report.md']){
  if(m.files[n]?.sha256!==sha(files[n])||m.files[n]?.size_bytes!==Buffer.byteLength(files[n]))fail('tampered '+n);
 }
 return {verified:true,review_status:'NOT_REVIEWED',report_sha256:m.files['report.md'].sha256};
}
function main(){
 const [cmd,first,second,third]=process.argv.slice(2);
 if(cmd==='build'){
  if(!first||!second||!third)fail('usage: build <collector-output.json> <approved-scope.json> <new-directory>');
  const e=JSON.parse(readFileSync(resolve(first),'utf8')),scope=JSON.parse(readFileSync(resolve(second),'utf8'));
  const files=buildInternalReviewPacket(e,scope);
  const dir=resolve(third);mkdirSync(dir,{recursive:true});
  for(const [n,data] of Object.entries(files))writeFileSync(join(dir,n),data,{flag:'wx',mode:0o600});
  console.log(JSON.stringify(verifyInternalReviewPacket(files)));
 }else if(cmd==='verify'){
  if(!first)fail('usage: verify <directory>');
  const files=Object.fromEntries(['assessment.json','report.md','manifest.json'].map(n=>[n,readFileSync(join(resolve(first),n),'utf8')]));
  console.log(JSON.stringify(verifyInternalReviewPacket(files)));
 }else fail('usage: build|verify');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))main();
