# Proofline — Synthetic release acceptance (2026-11-03)

**Release status: BLOCKED pending genuine user acceptance and hosted recovery.**

The protected Proofline API and encrypted custody/recovery prototype now have a single **isolated end-to-end acceptance test**. The local test executes:
synthetic JWT collector -> evidence POST -> reject self-review -> different JWT reviewer approval -> auditor chain verification -> Ed25519 signed checkpoint -> encrypted X25519/AES-GCM create-only bundle -> independent local restore -> restored review check.

Eight additional synthetic integration tests pass, including negative coverage for revoked memberships, anonymous users, forged role claims, cross-tenant requests, tampered checkpoint, and older signed checkpoint replay.

**Latest local test result:** 73 Python regression tests passed; 8 are new release-acceptance tests. The complete test package is distributed separately rather than publishing the private backend in this public repository.

**Public hosted safety canary:** `proofline-stage/test_public_sealed.py`, checked by `.github/workflows/proofline-sealed.yml` on changes to the Proofline staging files. The canary checks the public Render service is SEALED, readiness remains 503, and evidence POST is rejected. GitHub Actions results are not yet independently verified.

**Critical limitations:** These are local synthetic principals, SQLite custody, an in-process test signer and a local create-only store. They do not test actual Supabase Auth users, live PostgreSQL evidence writes, independent cloud key custody, or real external recovery. No real customer accounts or billing have been enabled. Do not promote the sealed Render gateway or treat a passing local test as production approval.

**Next gate:** provisioning two real synthetic Supabase Auth identities through supported Auth admin tooling, inserting genuine FK-backed memberships, testing positive and revoked authorization over signed sessions, then rehearsing real PostgreSQL writes and external recovery.
