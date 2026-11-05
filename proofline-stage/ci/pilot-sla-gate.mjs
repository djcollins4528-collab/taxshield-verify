import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const fail=(reason)=>({decision:'NO_GO',reason});
const validTime=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&/(Z|[+-]\d\d:\d\d)$/.test(x);
const weekday=d=>d.getUTCDay();
function nth(y,m,w,n){const first=new Date(Date.UTC(y,m-1,1));return new Date(Date.UTC(y,m-1,1+(w-first.getUTCDay()+7)%7+7*(n-1)));}
function last(y,m,w){const end=new Date(Date.UTC(y,m,0));return new Date(Date.UTC(y,m,end.getUTCDate()-(end.getUTCDay()-w+7)%7));}
function observed(y,m,d){const x=new Date(Date.UTC(y,m-1,d));if(x.getUTCDay()===6)x.setUTCDate(x.getUTCDate()-1);if(x.getUTCDay()===0)x.setUTCDate(x.getUTCDate()+1);return x;}
function daykey(d){return d.toISOString().slice(0,10);}
function nyDay(x){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(x));const obj=Object.fromEntries(parts.map(p=>[p.type,p.value]));return obj.year+'-'+obj.month+'-'+obj.day;}
function holidays(y){return new Set([observed(y,1,1),nth(y,1,1,3),nth(y,2,1,3),last(y,5,1),observed(y,6,19),observed(y,7,4),nth(y,9,1,1),nth(y,10,1,2),observed(y,11,11),nth(y,11,4,4),observed(y,12,25)].map(daykey));}
export function dueDate(ready,days=5){
 if(!validTime(ready)||!Number.isInteger(days)||days<1||days>10)throw new Error('invalid clock');
 const d=new Date(nyDay(ready)+'T12:00:00Z');let remaining=days;
 while(remaining){d.setUTCDate(d.getUTCDate()+1);const h=new Set([...holidays(d.getUTCFullYear()-1),...holidays(d.getUTCFullYear()),...holidays(d.getUTCFullYear()+1)]);if(weekday(d)!==0&&weekday(d)!==6&&!h.has(daykey(d)))remaining--;}
 return daykey(d);
}
export function evaluateRehearsals(receipts){
 if(!Array.isArray(receipts)||receipts.length<3)return fail('three independently recorded full-package rehearsals required');
 const classes=new Set(receipts.map(x=>x?.scenario));
 if(!['supported','exception','insufficient'].every(x=>classes.has(x)))return fail('missing supported, exception, or insufficient case');
 for(const x of receipts){
  if(!x||!validTime(x.readiness_at)||!validTime(x.delivered_at))return fail('missing authenticated readiness or delivery times');
  if(!x.real_tenant_authorized||!x.graph_collection_verified)return fail('authorized real-tenant collection unverified');
  if(!x.independent_human_reviewer_verified||!x.reviewer_attestation_verified_externally)return fail('independent accountable reviewer unverified');
  if(!x.full_package_integrity_verified||!x.recipient_handoff_verified||!x.same_session_revocation_verified||!x.fresh_signin_revocation_verified)return fail('secure complete-package delivery/revocation unverified');
  if(x.delivery_approved!==true||x.customer_data_policy_approved!==true)return fail('delivery and customer-data approval absent');
  if(!Number.isFinite(x.operator_minutes)||x.operator_minutes<=0||!Number.isFinite(x.reviewer_minutes)||x.reviewer_minutes<=0)return fail('unmeasured human labor');
  if(!Number.isFinite(x.elapsed_wall_minutes)||x.elapsed_wall_minutes<=0)return fail('unmeasured end-to-end wall time');
  if(nyDay(x.delivered_at)>dueDate(x.readiness_at,5))return fail('five-business-day SLA missed');
  if(!x.failure_recovery_tested)return fail('failure and recovery not demonstrated');
 }
 return {decision:'TECHNICAL_REHEARSAL_GATES_MET',count:receipts.length,commercial_activation:'REQUIRES_SEPARATE EXPLICIT APPROVAL'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+resolve(process.argv[1])).href){
 try{
  const path=process.argv[2];if(!path)throw Error('usage: node pilot-sla-gate.mjs receipts.json');
  const data=JSON.parse(await readFile(path,'utf8'));const result=evaluateRehearsals(data);
  console.log(JSON.stringify(result,null,2));if(result.decision==='NO_GO')process.exitCode=1;
 }catch(e){console.error(e.message);process.exitCode=1;}
}
