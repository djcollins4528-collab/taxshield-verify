# Isolated PostgreSQL 17 restore gate — 2026-11-03

**Implementation committed, execution status NOT VERIFIED. Production decision: NO-GO.**

- `proofline-stage/ci/synthetic-verified-archive.json`: two **synthetic encrypted** events, checksum-pinned (SHA-256 `f9a23bbea2e9a1dd2f9a898d27ba064b1a04718630673392f06baee7fd92f8fc`), no private keys or customer records.
- `proofline-stage/ci/run_isolated_restore.py`: fail-closed Python runner that validates the pinned input, builds PostgreSQL native `uuid`, `bytea`, `timestamptz` rows, verifies chain/reviewer separation, restores into a new schema, and tests tamper detection and uniqueness protection.
- `.github/workflows/proofline-postgres-restore.yml`: launches an ephemeral PostgreSQL 17 **separate from Supabase** using GitHub Actions, with synthetic-only secrets, destroys container on completion.
- Verified locally: Python runner `--dry-run` PASS with 7,481 bytes of generated SQL; canonical archive SHA-256 and two-event inventory PASS.
- **Not verified:** A successful GitHub Actions PostgreSQL 17 live run. The connected GitHub tools expose pull-request workflow runs and job details but not a listing of push-triggered runs for this workflow; do not claim a production disaster-recovery PASS.
- Existing two Supabase Free projects left unchanged. A new third project quoted $0/month but was rejected by the two-free-project limit; a branch cost $0.01344/hour and was NOT created.
- Supabase source post-check: one synthetic tenant, two encrypted events, one review, zero Auth users, memberships or admin acceptance runs.

**Still required**: confirmed green GitHub Actions hosted restore, actual isolated production-schema restore, test-user positive Auth, independently managed recovery keys and retention-locked backup, approved live customer intake/billing.
