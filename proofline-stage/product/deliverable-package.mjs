// Offline deterministic evidence package for synthetic demonstrations ONLY.
// This is not an independent review, Microsoft Graph connector, or customer delivery.
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assessSnapshot,compareSnapshots} from './synthetic-access-evaluator.mjs';
const digest=x=>createHash('sha256').update(x).digest('hex');
const stable=x=>JSON.stringify(x,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v,2)+'\n';
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validate=x=>{
 if(!x||x.synthetic!==true||!['assessment','drift'].includes(x.kind))throw Error('DELIVERY_NO_GO: synthetic assessment or drift only');
 if(x.kind==='assessment'&&!x.snapshot)throw Error('DELIVERY_NO_GO: missing snapshot');
 if(x.kind==='drift'&&(!x.before||!x.after))throw Error('DELIVERY_NO_GO: missing before/after');
 if(x.reviewer_approved===true||x.customer_ready===true)throw Error('DELIVERY_NO_GO: cannot assert review or customer readiness');
 return x;
};
export function buildPackage(input){
 const x=validate(input);
 const result=x.kind==='assessment'?assessSnapshot(x.snapshot):compareSnapshots(x.before,x.after);
 const payload={schema_version:1,product:'Proofline Access Assurance',classification:'SYNTHETIC DEMONSTRATION — NOT A CUSTOMER ASSESSMENT',
  service:x.kind==='assessment'?'Microsoft 365 Access Assurance Assessment':'Continuous Access Assurance snapshot comparison',
  review_status:'NOT_REVIEWED',delivery_status:'NOT_DELIVERED',customer_ready:false,
  result,source_hashes:x.kind==='assessment'?[x.snapshot.source.sha256]:[x.before.source.sha256,x.after.source.sha256]};
 const report='# Proofline Access Assurance — Synthetic demonstration\n\n'+
  '**NOT A CUSTOMER ASSESSMENT · NOT INDEPENDENTLY REVIEWED · NOT DELIVERED**\n\n'+
  'Service: '+payload.service+'\n\n'+
  'Scope: Named direct directory relationships only; no effective access, tenant-wide coverage or business-need certification.\n\n'+
  '## Observations\n\n```json\n'+stable(result)+'```\n\n'+
  '## Review and delivery status\n\nNo human reviewer has approved this version. No authorized recipient has received it.\n';
 const files={'assessment.json':stable(payload),'report.md':report};
 const manifest={schema_version:1,classification:payload.classification,review_status:'NOT_REVIEWED',delivery_status:'NOT_DELIVERED',
  files:Object.fromEntries(Object.entries(files).map(([name,bytes])=>[name,{sha256:digest(bytes),size_bytes:Buffer.byteLength(bytes)}]))};
 return {...files,'manifest.json':stable(manifest)};
}
export function verifyPackage(files){
 const required=['assessment.json','report.md','manifest.json'];
 if(!files||required.some(k=>typeof files[k]!=='string'))throw Error('DELIVERY_NO_GO: missing package file');
 const manifest=JSON.parse(files['manifest.json']);
 const payload=JSON.parse(files['assessment.json']);
 if(manifest.schema_version!==1||payload.schema_version!==1||
    manifest.review_status!=='NOT_REVIEWED'||manifest.delivery_status!=='NOT_DELIVERED'||
    payload.review_status!=='NOT_REVIEWED'||payload.delivery_status!=='NOT_DELIVERED'||
    payload.customer_ready!==false||!payload.classification.includes('SYNTHETIC'))
   throw Error('DELIVERY_NO_GO: unsafe status');
 if(Object.keys(manifest.files||{}).sort().join(',')!=='assessment.json,report.md')
   throw Error('DELIVERY_NO_GO: unexpected manifest files');
 for(const name of ['assessment.json','report.md']){
  if(manifest.files[name].sha256!==digest(files[name])||manifest.files[name].size_bytes!==Buffer.byteLength(files[name]))
   throw Error('DELIVERY_NO_GO: tampered '+name);
 }
 if(!files['report.md'].includes('NOT INDEPENDENTLY REVIEWED'))throw Error('DELIVERY_NO_GO: missing disclosure');
 return {verified:true,report_sha256:manifest.files['report.md'].sha256,manifest_sha256:digest(files['manifest.json']),
  status:'SYNTHETIC_UNREVIEWED'};
}
function main(){
 const [cmd,inputFile,outputDir]=process.argv.slice(2);
 if(cmd==='build'){
  if(!inputFile||!outputDir)throw Error('Usage: node deliverable-package.mjs build <synthetic.json> <empty-output-directory>');
  const input=JSON.parse(readFileSync(resolve(inputFile),'utf8'));
  const files=buildPackage(input);
  const out=resolve(outputDir);
  mkdirSync(out,{recursive:true});
  // Never overwrite existing evidence.
  for(const [name,bytes] of Object.entries(files))writeFileSync(join(out,name),bytes,{flag:'wx',mode:0o600});
  console.log(JSON.stringify(verifyPackage(files)));
 }else if(cmd==='verify'){
  if(!inputFile)throw Error('Usage: node deliverable-package.mjs verify <package-directory>');
  const files=Object.fromEntries(['assessment.json','report.md','manifest.json'].map(n=>[n,readFileSync(join(resolve(inputFile),n),'utf8')]));
  console.log(JSON.stringify(verifyPackage(files)));
 }else throw Error('Usage: node deliverable-package.mjs build|verify ...');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))main();
