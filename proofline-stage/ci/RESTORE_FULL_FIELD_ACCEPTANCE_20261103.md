# Proofline isolated PostgreSQL restore — hardening follow-up (2026-11-03)

**Status: implementation committed; successful GitHub-hosted PostgreSQL execution NOT independently verified.**

## New committed controls

- `run_isolated_restore.py` now checks the pinned tenant list, the full two-event sequence, same tenant, distinct collector/reviewer and exact evidence review target before generating any SQL.
- The PostgreSQL restore transaction now compares ALL fields recovered from the pinned JSON fixture against PostgreSQL's native typed table with a bidirectional EXCEPT query, including the encrypted `bytea` payload, nonces, roles, identifiers and timestamps. A hash-only or row-count-only comparison is no longer sufficient.
- Existing independent PostgreSQL readback must return exactly two events and one review or fail.
- `test_isolated_restore.py` now also checks the all-field SQL comparison and a deliberately broken reviewer chain.
- The workflow already runs the test suite and the PostgreSQL 17 service container test on changes to `proofline-stage/ci/**`.

## Verification

- Offline synthetic-archive checks: passed in local rehearsal, including a newly added broken-reviewer-link check.
- Hosted GitHub Actions: `get_commit_combined_status` returned no statuses; `fetch_commit_workflow_runs` yielded no PR-associated runs. These interfaces do **not** prove that a push-triggered run failed, passed, or started. Green hosted restore still requires direct GitHub Actions run/job confirmation.
- No customer data, real Auth principal, billing action or new cloud resource created.

## Outstanding gate

A verifiable green GitHub workflow run, then genuine hosted Supabase Auth collector/reviewer tests, production-grade key custody, protected export identity, retention-controlled backup and real operational restore.
