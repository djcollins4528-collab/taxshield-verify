# Proofline production release decision — November 3, 2026

**Status: NO-GO. This is an evidence-accounting gate, not a verified independent release-authorization system.**

The repository now declares four *verified staging/synthetic* milestones separately from eight **required genuine production acceptance** conditions. The gate deliberately cannot treat synthetic RLS, PG17 recovery, public negative probes, or mocked Auth checks as customer production readiness.

- Schema: `proofline-stage/release/production-readiness.json`
- Deterministic evaluator: `proofline-stage/release/release_gate.mjs`
- Negative/regression tests: `proofline-stage/release/release_gate.test.mjs`
- Workflow: `.github/workflows/proofline-release-decision.yml`

The run must explicitly show `PROOFLINE_RELEASE_DECISION=NO_GO`, customer intake disabled, billing disabled, and production activation disabled. The test suite rejects omitted/duplicated gates, unknown status values, evidence-free production claims, mislabeling synthetic results as production, counterfeit approval alone, and premature activation.

**Eight actual blockers remain:** genuine collector sign-in, genuine reviewer sign-in, real session revocation, complete paid-customer delivery acceptance, independent production signing-key custody and offsite recovery, legal/business approvals, signed customer protections/insurance, and live merchant payments.

The existing Supabase staging database still has zero Auth users and zero memberships. The public Render gateway remains sealed, and its latest five-probe hosted checks passed. Plus-addressed collector/reviewer test mail delivery was confirmed through owner Gmail, but signup script integration is blocked by the repository tool; the pending owner-alias PR is deliberately not promoted. Never infer that email receipt means Auth identity exists.

**Important deployment caveat:** GitHub Actions checks do not necessarily block merge or deploy unless repository branch protection/deployment environments require them. The evaluator validates *declared* evidence shapes and a conservative release decision; it does not fetch/cryptographically verify every proof URL or authenticate approval signers. No production deploy target or payment capability was enabled by this work.
