# Proofline — hosted PostgreSQL 17 isolated restore verified

**Date:** November 3, 2026. **Gate:** isolated synthetic PostgreSQL restore — PASS. **Customer production release:** STILL NO-GO.

## Verification evidence

- Pull request: https://github.com/djcollins4528-collab/taxshield-verify/pull/1
- Hosted recovery GitHub Actions run: https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41707714386
- Recovery job ID: `126167327312`
- Recovery job result: `completed / success`
- Pinned encrypted synthetic archive verification: PASS
- Offline signature/integrity/reviewer checks: `Ran 9 tests ... OK`
- Fresh external PostgreSQL 17 container: restore PASS; source contains 2 synthetic custody events, 1 independent review
- Postgres native field-by-field equivalence, reviewer linkage, tamper detection, duplicate-write blocking, independent readback: PASS
- Sealed staging GitHub Actions run: https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41707714484
- Sealed and identity-policy jobs: both `completed / success`.
- PR squash merge into main: `2cb2adf9df6e3eece821e8a64b37816f490cc5f6`.

## Bugs found by real hosted CI

1. PL/pgSQL `DO` blocks had invalid end delimiters, rejecting the SQL restore despite passing offline tests.
2. An intermediate regression test then exposed malformed SQL dollar quoting in the branch.
3. Converted each block to explicitly paired `DO $pl$` ... `END; $pl$;` and added a regression test before the successful fresh PostgreSQL 17 run.

## Scope and limitations

- This is an independently hosted **ephemeral GitHub Actions PostgreSQL 17** restore test of a fixed **synthetic** archive, not a full customer database restore.
- PostgreSQL instance and synthetic login are destroyed at job completion; there are no customer or Supabase database credentials in CI.
- The recovery provenance check uses a pinned public Ed25519 key and signed synthetic inventory. No private keys are committed to GitHub.
- Genuine Supabase Auth collector/reviewer positive sessions, real runtime evidence writes, independent durable production signing keys, retention-lock/WORM storage, and recovery of operational production schema remain pending.
- Billing and customer evidence intake are disabled. No new paid resources were created.
