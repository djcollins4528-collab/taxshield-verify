import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {verifyPackage} from './verify-pilot-package.mjs';

const C='11111111-1111-4111-8111-111111111111',T='22222222-2222-4222-8222-222222222222',U='44444444-4444-4444-8444-444444444444',R='33333333-3333-4333-8333-333333333333';
const SHA=b=>createHash('sha256').update(b).digest('hex');
const lines=(s)=>String(s).replace(/[^ -~]/g,'?').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
function pdf(linesIn){
 const a=linesIn.flatMap(x=>{const words=String(x).split(' '),out=[];let row='';for(const w of words){if((row+' '+w).length>81){out.push(row);row=w;}else row+=(row?' ':'')+w;}out.push(row);return out;}).slice(0,45);
 const stream='BT\n/F1 10 Tf\n13 TL\n50 735 Td\n'+a.map((s,i)=>(i?'T*\n':'')+'('+lines(s)+') Tj').join('\n')+'\nET\n';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'endstream'];
 let result='%PDF-1.4\n';const offsets=[];
 for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(result));result+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}
 const start=Buffer.byteLength(result);result+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
 for(const n of offsets)result+=String(n).padStart(10,'0')+' 00000 n \n';
 result+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n';
 return Buffer.from(result);
}
const csv=rows=>Buffer.from(rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n')+'\n');
async function one(out,scenario,phase){
 const t=performance.now(),dir=join(out,scenario,phase);await mkdir(dir,{recursive:true});
 const rev=scenario==='supported'?'PASS':'INCONCLUSIVE',group=scenario==='supported'?'PASS':scenario==='exception'?'FAIL':'INCONCLUSIVE',version=phase==='retest'?'1.1':'1.0';
 const f=[
  {id:'F1',control:'sign_in_disabled',result:'PASS',criterion:'accountEnabled false',reasoning:'Synthetic user state disabled',evidence_ids:['S1']},
  {id:'F2',control:'session_revocation',result:rev,criterion:'attributable revocation audit action',reasoning:rev==='PASS'?'Synthetic audit supports revocation':'Synthetic audit record unavailable',evidence_ids:rev==='PASS'?['S3']:[]},
  {id:'F3',control:'relationship:'+R,result:group,criterion:'named group relation removed',reasoning:group==='PASS'?'Synthetic group user absent':group==='FAIL'?'Synthetic group user still present':'Incomplete synthetic membership observation',evidence_ids:group==='INCONCLUSIVE'?[]:['S2']}
 ].map(x=>({...x,case_id:C,observed_at:'2026-11-02T12:00:00Z',...(x.result==='INCONCLUSIVE'?{limitations:'Mandatory attributable source is unavailable'}:{})}));
 const evidence=['S1','S2','S3'].map(id=>({id,source:'FICTIONAL Graph/Entra '+id,collected_at:'2026-11-02T12:00:00Z',sha256:SHA('fictional-source-'+id)}));
 const remediation=f.filter(x=>['FAIL','INCONCLUSIVE','NOT_TESTED'].includes(x.result)).map(x=>({finding_id:x.id,owner_role:'customer administrator',action:'Provide missing attributable evidence or remove named relationship',retest_criterion:'Complete new verified observation'}));
 const artifacts={};
 async function add(key,path,body){const b=Buffer.isBuffer(body)?body:Buffer.from(body);await writeFile(join(dir,path),b,{flag:'wx'});artifacts[key]={path,sha256:SHA(b),case_id:C,reviewed_version:version};return b;}
 const report=[
  'PROOFLINE ASSURANCE / SYNTHETIC REPORT / NOT FOR CUSTOMER USE',
  'Scenario '+scenario+' | Phase '+phase+' | Version '+version,'Case '+C,'Tenant '+T,'Subject '+U,
  'Departure 2026-11-01T12:00:00Z; cutoff 2026-11-02T12:00:00Z',
  'One cloud-only member, one named static group, exact controls only',
  ...f.flatMap(x=>[x.id+' '+x.control+' RESULT '+x.result,'Criterion '+x.criterion+' | Reason '+x.reasoning,'Evidence '+(x.evidence_ids.join(',')||'UNAVAILABLE')]),
  'NO UNIVERSAL ACCESS REMOVAL CERTIFICATION',
  'SIMULATED REVIEW ONLY. Independent human review has not occurred.',
  'CUSTOMER DELIVERY LOCKED / NO PAYMENT OR INTAKE'
 ];
 const p=await add('assessment_pdf','assessment.pdf',pdf(report));
 await add('evidence_register','evidence-register.csv',csv([['ID','Source','Collected','SHA256'],...evidence.map(x=>[x.id,x.source,x.collected_at,x.sha256])]));
 await add('remediation_worksheet','remediation-worksheet.csv',csv([['Finding','Owner','Action','Retest'],...remediation.map(x=>[x.finding_id,x.owner_role,x.action,x.retest_criterion])]));
 let retest;
 if(phase==='retest'){
  const original=await readFile(join(out,scenario,'initial','assessment.pdf'));
  await writeFile(join(dir,'original-report-preserved.pdf'),original,{flag:'wx'});
  retest={original_report_sha256:SHA(original),observed_at:'2026-11-04T14:00:00Z'};
  await add('retest_addendum','retest-addendum.txt','SYNTHETIC RETEST / '+C+'\nOriginal preserved '+SHA(original)+'\nNo real retest occurred. NOT_TESTED. Customer delivery remains disabled.\n');
 }
 const manifest={schema_version:1,synthetic:true,case_id:C,phase,version,tenant_id:T,subject_id:U,departure_at:'2026-11-01T12:00:00Z',collection_cutoff_at:'2026-11-02T12:00:00Z',readiness_at:'2026-11-02T13:00:00Z',report_completed_at:'2026-11-03T13:00:00Z',delivery_approved:false,scope:{relationship_ids:[R]},review:{collector_actor_id:'synthetic-collector',reviewer_actor_id:'synthetic-reviewer',reviewed_at:'2026-11-03T12:30:00Z',approved:true,independent_human_verified:true,independence_receipt_id:'SIMULATED-NOT-A-HUMAN',reviewed_report_sha256:SHA(p)},evidence,findings:f,remediation,artifacts,...(retest?{retest}:{})};
 await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 const verified=await verifyPackage(manifest,dir);
 if(verified.status!=='PACKAGE_CONTRACT_PASS')throw Error('contract rejected');
 return {scenario,phase,artifacts:Object.keys(artifacts).length,elapsed_ms:Number((performance.now()-t).toFixed(2)),status:'SYNTHETIC_CONTRACT_PASS'};
}
export async function run(out){
 const runs=[];
 for(const scenario of ['supported','exception','insufficient'])for(const phase of ['initial','retest'])runs.push(await one(out,scenario,phase));
 const receipt={classification:'SYNTHETIC ONLY - NOT A CUSTOMER ACCEPTANCE',runs,independent_human_review:false,real_entra_collection:false,real_recipient_delivery:false,commercial_release:'NO_GO'};
 await writeFile(join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
 return receipt;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+resolve(process.argv[1])).href){
 try{if(!process.argv[2])throw Error('requires temporary output directory');console.log(JSON.stringify(await run(resolve(process.argv[2])),null,2));}
 catch(e){console.error(e);process.exitCode=1;}
}
