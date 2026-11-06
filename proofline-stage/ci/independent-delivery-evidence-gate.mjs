// Fail-closed structural checks. These receipts must still be authenticated and verified against custody sources.
const hex=x=>typeof x==='string' && /^[a-f0-9]{64}$/i.test(x);
const uuid=x=>typeof x==='string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(x);
const instant=x=>typeof x==='string' && /(Z|[+-]\d{2}:\d{2})$/.test(x) && Number.isFinite(Date.parse(x));
const before=(a,b)=>Date.parse(a)<=Date.parse(b);
export function validateEvidenceChain(x) {
  if(!x || !uuid(x.tenant_id) || !uuid(x.subject_id) || !uuid(x.reviewer_id) || !uuid(x.collector_id))
    return 'missing scoped tenant, subject, collector, or reviewer IDs';
  if(x.collector_id.toLowerCase()===x.reviewer_id.toLowerCase())
    return 'collector and reviewer identity conflict';
  if(!hex(x.report_sha256) || !hex(x.evidence_manifest_sha256) || !hex(x.package_sha256))
    return 'missing report, evidence manifest, or complete-package SHA-256';
  if(x.reviewer_signed_report_sha256?.toLowerCase()!==x.report_sha256.toLowerCase() ||
     x.reviewer_decision!=='APPROVE' || !x.reviewer_receipt_id)
    return 'reviewer approval does not bind exact report version';
  if(!x.collector_evidence_ref || !x.reviewer_evidence_ref ||
     !x.recipient_download_receipt_id || !x.withdrawal_receipt_id ||
     !x.same_session_denial_receipt_id || !x.fresh_signin_denial_receipt_id ||
     !x.recovery_receipt_id)
    return 'missing attributable source, review, delivery, denial, or recovery receipt';
  const events=['readiness_at','collection_at','reviewer_approved_at','package_issued_at',
    'recipient_downloaded_at','delivered_at','withdrawn_at','same_session_denied_at',
    'fresh_signin_denied_at','recovery_verified_at'];
  if(events.some(k=>!instant(x[k])))return 'missing timestamped delivery custody chain';
  if(events.slice(1).some((k,i)=>!before(x[events[i]],x[k])))
    return 'out-of-order custody or approval timestamps';
  if(new Set([x.collector_evidence_ref,x.reviewer_evidence_ref,
    x.recipient_download_receipt_id,x.withdrawal_receipt_id,
    x.same_session_denial_receipt_id,x.fresh_signin_denial_receipt_id,
    x.recovery_receipt_id]).size!==7)
    return 'reused evidence identifiers across distinct controls';
  return null;
}
