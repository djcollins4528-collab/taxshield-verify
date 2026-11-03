# Isolated PostgreSQL recovery CI hardening — 2026-11-03

**Production result: NO-GO, hosted GitHub Actions status not verified.**

## Implemented and committed

- `proofline-stage/ci/test_isolated_restore.py`: four tests check pinned fixture SHA-256, evidence→review linkage, SQL safe destination, tampered ciphertext rejection and unauthorized tenant change rejection before PostgreSQL.
- `proofline-stage/ci/run_isolated_restore.py`: restored data is re-read from actual PostgreSQL and must equal **exactly 2 encrypted synthetic records and 1 review**. Aborts on query errors or wrong counts rather than relying on stdout string matching.
- `.github/workflows/proofline-postgres-restore.yml`: now runs the offline tamper tests and launches the existing ephemeral PostgreSQL 17 service, then tests SQL restoration.
- No customer records, passwords or recovery private keys were committed; the pinned archive contains synthetic ciphertext only.

## Verified in current working container

- Four new offline tests: PASS.
- Pinned archive SHA-256 and SQL generation: PASS.
- Older mounted backend snapshot: 73 tests PASS, NOT the newer 95-test recovery package.
- GitHub combined commit status exposed no statuses; connected action-run lookup showed no runs because it only includes pull-request runs. Therefore a successful **hosted PostgreSQL execution remains UNVERIFIED**.

## Production next gates

1. Verify green hosted restore via GitHub Actions run logs.
2. Test genuine Supabase Auth collector and reviewer accounts, revocation and tenant isolation.
3. Introduce durable independent signing keys, restricted archival/export credentials and retention-protected offsite storage.
4. Run a separate real recovery instance with supported privileged restore of the production-shaped schema; do not assume ephemeral synthetic fixture tests prove disaster recovery.

Customer intake and live payments remain OFF. No new paid infrastructure was provisioned.
