import {readFileSync} from 'node:fs';
const REQUIRED=Object.freeze([
 'real_collector_auth','real_reviewer_auth','live_auth_revocation',
 'customer_end_to_end_delivery','independent_production_key_custody',
 'legal_operating_clearances','contract_privacy_insurance','merchant_live_payments'
]);
const STAGING=Object.freeze([
 'isolated_pg17_recovery','tenant_role_rls','membership_revocation','sealed_public_ingress'
]);
const productionStatus=new Set(['blocked','verified_production']);
const stagingStatus=new Set(['verified_synthetic','verified_staging']);
const evidenceUrl=(url)=>typeof url==='string'&&
 /^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/[0-9]+$/.test(url);
function exactIdSet(items,expected){
 return Array.isArray(items)&&items.length===expected.length&&
   items.every(item=>item&&typeof item.id==='string')&&
   new Set(items.map(item=>item.id)).size===expected.length&&
   expected.every(id=>items.some(item=>item.id===id));
}
export function evaluate(manifest){
 if(!manifest||manifest.schema!=='proofline.release.evidence.v1'||
    manifest.target!=='customer_production')
   throw Error('Invalid or unrecognized release manifest');
 if(!exactIdSet(manifest.staging_evidence,STAGING)||!exactIdSet(manifest.launch_gates,REQUIRED))
   throw Error('Release evidence inventory incomplete or duplicated');
 for(const item of manifest.staging_evidence) {
  if(!stagingStatus.has(item.status)||!evidenceUrl(item.evidence_url)||!item.scope)
   throw Error('Staging provenance missing: '+item.id);
 }
 for(const item of manifest.launch_gates){
  if(!productionStatus.has(item.status))throw Error('Unknown release status: '+item.id);
  if(item.status==='verified_production'&&(!evidenceUrl(item.evidence_url)||!item.detail))
   throw Error('Production acceptance lacks evidence: '+item.id);
  if(item.status==='blocked'&&item.evidence_url!==null)
   throw Error('Blocked gate cannot claim production evidence: '+item.id);
 }
 if(!manifest.approval||!['not_issued','approved'].includes(manifest.approval.status))
   throw Error('Release approval state unrecognized');
 const blocked=manifest.launch_gates.filter(x=>x.status!=='verified_production').map(x=>x.id);
 const prerequisites=blocked.length===0;
 const signedApproval=manifest.approval.status==='approved' &&
  typeof manifest.approval.approved_by==='string'&&manifest.approval.approved_by.trim().length>0 &&
  typeof manifest.approval.approved_at==='string'&&!Number.isNaN(Date.parse(manifest.approval.approved_at)) &&
  typeof manifest.approval.protected_environment_review==='string' &&
  manifest.approval.protected_environment_review.trim().length>0;
 // Do not turn this into a production activation control on its own:
 // approvals must be independently validated by a protected deploy environment.
 const canConsiderGo=prerequisites&&signedApproval;
 const protectiveState=manifest.production_activation==='disabled' &&
   manifest.customer_intake==='disabled'&&manifest.live_billing==='disabled';
 if(!canConsiderGo&&!protectiveState)throw Error('Unsafe activation while release is not approved');
 if(canConsiderGo&&!(manifest.production_activation==='disabled'&&manifest.customer_intake==='disabled'&&manifest.live_billing==='disabled'))
  throw Error('Evaluation must precede production enablement');
 return {decision:canConsiderGo?'READY_FOR_INDEPENDENT_APPROVAL_VALIDATION':'NO_GO',
  blocked,protectiveState,verifiedStaging:manifest.staging_evidence.length,
  liveGatesPassed:manifest.launch_gates.length-blocked.length,
  note:'Declared evidence requires independent validation; this file cannot authorize deployment'};
}
export function cli(argv=process.argv){
 const target=new URL('./production-readiness.json',import.meta.url);
 const record=JSON.parse(readFileSync(target,'utf8'));
 const result=evaluate(record);
 console.log('PROOFLINE_RELEASE_DECISION='+result.decision);
 console.log('PRODUCTION_ACTIVATION='+record.production_activation);
 console.log('CUSTOMER_INTAKE='+record.customer_intake);
 console.log('LIVE_BILLING='+record.live_billing);
 console.log('STAGING_EVIDENCE='+result.verifiedStaging);
 console.log('VERIFIED_LIVE_GATES='+result.liveGatesPassed+'/'+record.launch_gates.length);
 console.log('BLOCKED_GATES='+result.blocked.join(','));
 console.log('NOTE='+result.note);
 if(argv.includes('--require-go')&&result.decision!=='READY_FOR_INDEPENDENT_APPROVAL_VALIDATION')
  process.exitCode=3;
 return result;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)cli();
