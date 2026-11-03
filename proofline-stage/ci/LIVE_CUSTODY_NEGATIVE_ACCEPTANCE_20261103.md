# Proofline — live custody separation and immutability acceptance (November 3, 2026)

**Result: PASS against actual Supabase staging database (management role), synthetic-only. Customer release remains NO-GO.**

## Verified against live PostgreSQL
- Read actual `proofline_private.custody_events` triggers and indexes in project `pgknyzwctmfqvlivlgpe`.
- Pre-existing `proofline_custody_append_guard` trigger checks review references existing same-tenant evidence, rejects reviewer actor matching original collector, validates event type/role and enforces continuous digest/sequence.
- Pre-existing `proofline_one_review_per_evidence` is a **UNIQUE** partial index on `(tenant_id,reviewed_evidence_id)` for `kind='review'`. No redundant index was added.
- Pre-existing `proofline_custody_reject_mutation` rejects UPDATE/DELETE, and `proofline_custody_reject_truncate` rejects TRUNCATE.
- Ran a BEGIN / DO block / ROLLBACK transaction with five deliberately prohibited actions, each caught by its **expected** SQLSTATE class: (1) collector reviewing own evidence (check_violation), (2) another independent reviewer approving already-reviewed evidence (unique_violation), (3) event kind/role mismatch (check_violation), (4) UPDATE (check_violation), (5) DELETE (check_violation). **No unexpected operation was accepted**, so the DO block completed without an assertion exception.
- Follow-up independent SELECT verified **2 existing synthetic custody rows, 1 review, sequence 1–2, both original event digests unchanged**.
- Reproducible operator-only acceptance script committed at `proofline-stage/ci/live_custody_negative_acceptance_20261103.sql`.

## Critical limitations
- This demonstrates live database trigger and index behavior using a privileged management connection in a rolled-back synthetic transaction. It does not prove that a valid signed Supabase Auth reviewer session can submit a review through the live backend.
- HMAC/AES-GCM verification and independent production key custody are separate gates.
- Existing Auth project has no genuine two-user acceptance. No public customer intake or payments were activated and the restricted runtime login remains disabled.
- No DB schema migration was necessary because the relevant unique index and triggers **already existed**.

**Next go/no-go:** two genuine Auth users in the official Supabase service; apply guarded enrollment only after email confirmation; execute protected Auth workflow, then an authorized end-to-end evidence → independent review → recovery rehearsal with those two identities.
