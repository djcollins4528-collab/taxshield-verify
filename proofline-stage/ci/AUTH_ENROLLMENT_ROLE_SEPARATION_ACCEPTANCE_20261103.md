# Proofline — Auth enrollment and separation-of-duties acceptance (2026-11-03)

**Live database uniqueness: DEPLOYED. Hosted PostgreSQL 17 CI: PASS. Genuine Supabase Auth enrollment: PENDING. Production: NO-GO.**

## Verified milestone
- Live Supabase staging project `pgknyzwctmfqvlivlgpe` now has `proofline_private.memberships.proofline_single_role_per_user_per_tenant` as a unique `(tenant_id,auth_user_id)` constraint. This prevents a single Auth account from accumulating both collector and reviewer roles for the same tenant.
- Source migration: `proofline-stage/migrations/20261103_single_role_per_auth_user.sql`.
- One-time operator-only script: `proofline-stage/ci/enroll_existing_auth_test_users.sql`. It requires two distinct pre-existing email-confirmed, nonanonymous, non-banned, non-deleted Supabase Auth test accounts; refuses non-test email names, missing variables, or an already-populated tenant; verifies postconditions in one PostgreSQL transaction and rolls back on failure. It does not provision Auth users and creates no long-lived SECURITY DEFINER/admin API.
- Hosted synthetic PostgreSQL 17 test and workflow: `proofline-stage/ci/test_one_role_enrollment_fixture.sql`, `.github/workflows/proofline-postgres-restore.yml`. Positive two-account enrollment and negative missing-variable, non-test email, repeat enrollment and duplicate-role assertions PASS.
- PR [#7](https://github.com/djcollins4528-collab/taxshield-verify/pull/7) squash merged to `main` at `80eb95b0e311222ea14632ead39c271a0cfa600a`.
- GitHub Actions [run 41742809157](https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41742809157), PostgreSQL 17 job `126288275208`, completed SUCCESS, specifically both enrollment acceptance steps success. [Sealed staging run 41742809192](https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41742809192) succeeded.
- Live postcheck: membership constraint exists; 0 Auth users, 0 sessions, 0 memberships, 2 synthetic custody events, restricted login still NOLOGIN. No new paid infrastructure or customer data.

## Unfinished live gate

Two actual independent synthetic Supabase Auth accounts still need creation using the **official** Auth Dashboard/Admin interface (not raw inserts into `auth.users`), and dedicated verified mailboxes. Then the privileged, parameterized one-time enrollment script can be run in a controlled operator session. Real collector/reviewer authentication, authorization, logout and session revocation must be verified via the previously implemented protected manual live Auth workflow.

A unique role constraint alone does not independently enforce custody review separation; the existing custody guard verifies distinct actors, and that must remain in effect. The one-time enrollment script intentionally does not assign customer roles or enable live endpoints.

**Customer intake, payments and database runtime login remain disabled.**
