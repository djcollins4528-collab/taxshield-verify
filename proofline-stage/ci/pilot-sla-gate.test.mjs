import test from 'node:test';
import assert from 'node:assert/strict';
import {dueDate,evaluateRehearsals} from './pilot-sla-gate.mjs';
const digest='a'.repeat(64),manifest='b'.repeat(64),packageDigest='c'.repeat(64);
const custody={
 tenant_id:'c3a220f5-0086-484c-ae8c-bf3271ccfc73',
 subject_id:'7b1984c6-18eb-4272-b010-0e237c550b40',
 collector_id:'11111111-1111-4111-8111-111111111111',
 reviewer_id:'22222222-2222-4222-8222-222222222222',
 report_sha256:digest, reviewer_signed_report_sha256:digest,
 evidence_manifest_sha256:manifest, package_sha256:packageDigest,
 reviewer_decision:'APPROVE', reviewer_receipt_id:'review-signoff-1',
 collector_evidence_ref:'collector-source-1', reviewer_evidence_ref:'review-source-1',
 recipient_download_receipt_id:'download-1', withdrawal_receipt_id:'withdrawal-1',
 same_session_denial_receipt_id:'deny-session-1', fresh_signin_denial_receipt_id:'deny-fresh-1',
 recovery_receipt_id:'recovery-1',
 collection_at:'2026-11-02T14:00:00Z',
 reviewer_approved_at:'2026-11-03T13:00:00Z',
 package_issued_at:'2026-11-04T13:00:00Z',
 recipient_downloaded_at:'2026-11-04T14:00:00Z',
 withdrawn_at:'2026-11-09T15:00:00Z',
 same_session_denied_at:'2026-11-09T15:01:00Z',
 fresh_signin_denied_at:'2026-11-09T15:02:00Z',
 recovery_verified_at:'2026-11-09T16:00:00Z'
};
const good=scenario=>({...custody,scenario,readiness_at:'2026-11-02T13:00:00Z',delivered_at:'2026-11-09T14:00:00Z',real_tenant_authorized:true,graph_collection_verified:true,independent_human_reviewer_verified:true,reviewer_attestation_verified_externally:true,full_package_integrity_verified:true,recipient_handoff_verified:true,same_session_revocation_verified:true,fresh_signin_revocation_verified:true,delivery_approved:true,customer_data_policy_approved:true,operator_minutes:140,reviewer_minutes:80,elapsed_wall_minutes:6900,failure_recovery_tested:true});
const triplet=()=>['supported','exception','insufficient'].map(good);
test('five business days after November 2 is November 9',()=>assert.equal(dueDate('2026-11-02T13:00:00Z'),'2026-11-09'));
test('Thanksgiving excludes Thursday and Friday is next work day',()=>assert.equal(dueDate('2026-11-25T14:00:00Z',1),'2026-11-27'));
test('observed Christmas exclusion',()=>assert.equal(dueDate('2026-12-24T14:00:00Z',1),'2026-12-28'));
test('three valid evidence assertions meet only technical gates',()=>assert.equal(evaluateRehearsals(triplet()).decision,'TECHNICAL_REHEARSAL_GATES_MET'));
test('synthetic runs do not satisfy release',()=>{const a=triplet();a[0].real_tenant_authorized=false;assert.equal(evaluateRehearsals(a).decision,'NO_GO')});
test('no independent human means no go',()=>{const a=triplet();a[1].independent_human_reviewer_verified=false;assert.match(evaluateRehearsals(a).reason,/reviewer/)});
test('no recipient withdrawal means no go',()=>{const a=triplet();a[2].fresh_signin_revocation_verified=false;assert.equal(evaluateRehearsals(a).decision,'NO_GO')});
test('no real labor measurement means no go',()=>{const a=triplet();a[1].reviewer_minutes=0;assert.match(evaluateRehearsals(a).reason,/labor/)});
test('missed deadline means no go',()=>{const a=triplet();a[0].delivered_at='2026-11-10T14:00:00Z'; a[0].withdrawn_at='2026-11-10T15:00:00Z'; a[0].same_session_denied_at='2026-11-10T15:01:00Z'; a[0].fresh_signin_denied_at='2026-11-10T15:02:00Z'; a[0].recovery_verified_at='2026-11-10T16:00:00Z';assert.match(evaluateRehearsals(a).reason,/SLA/)});
test('one case does not satisfy three rehearsals',()=>assert.equal(evaluateRehearsals([good('supported')]).decision,'NO_GO'));
test('never turns on commercial activation',()=>assert.match(evaluateRehearsals(triplet()).commercial_activation,/SEPARATE/));

test('reject same human acting as collector and reviewer',()=>{const a=triplet();a[0].reviewer_id=a[0].collector_id;assert.match(evaluateRehearsals(a).reason,/conflict/)});
test('reject approval of different PDF hash',()=>{const a=triplet();a[1].reviewer_signed_report_sha256='f'.repeat(64);assert.match(evaluateRehearsals(a).reason,/exact report/)});
test('reject omitted custody receipt',()=>{const a=triplet();delete a[2].fresh_signin_denial_receipt_id;assert.match(evaluateRehearsals(a).reason,/missing attributable/)});
test('reject approval after package issue',()=>{const a=triplet();a[0].reviewer_approved_at='2026-11-05T14:00:00Z';assert.match(evaluateRehearsals(a).reason,/out-of-order/)});
test('reject repeated custody IDs',()=>{const a=triplet();a[0].withdrawal_receipt_id=a[0].recipient_download_receipt_id;assert.match(evaluateRehearsals(a).reason,/reused/)});
test('reject missing explicit signed decision',()=>{const a=triplet();a[0].reviewer_decision='INCONCLUSIVE';assert.match(evaluateRehearsals(a).reason,/approval/)});
