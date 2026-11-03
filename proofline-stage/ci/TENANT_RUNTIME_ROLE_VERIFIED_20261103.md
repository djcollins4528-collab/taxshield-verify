# Verified two-tenant restrictive role acceptance — 2026-11-03

**Milestone: PASS in independent hosted PostgreSQL 17. Production customer launch: NO-GO.**

- PR: https://github.com/djcollins4528-collab/taxshield-verify/pull/2
- Hosted job: https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41727625323
- Job id `126236453893`, `completed/success`.
- GitHub job logs contain: `PASS: tenant-isolation policy as genuine restricted PG role`.
- The signed-archive recovery and its nine offline assertions passed in the same run; sealed staging and identity-policy jobs also passed (run `41727625290`).
- Squash merged to `main`: `644eb78055b5001f401c3f34114689d6824d21f5`.
- Script `proofline-stage/ci/test_tenant_rls.sql` applies the EXACT previously deployed `../migrations/20261103_restrictive_tenant_rls.sql` to a fresh GitHub Actions PostgreSQL 17 database with unrestricted legacy policies.
- Tests use `SET LOCAL ROLE proofline_stage_runtime` under a NOLOGIN, NOBYPASSRLS role and two synthetic tenants. Tests verify absence of context denies reads and insert, tenant A cannot see or write tenant B, tenant A can insert its own row, tenant B sees only its own rows in a separate transaction, malformed context does not match, and rollback prevents persistent test mutations.
- Live Supabase staging postcheck: 1 synthetic tenant, 2 encrypted custody events, 0 memberships, 0 Auth users; `proofline_stage_login` still NOLOGIN.
- No new customer-facing endpoints, payments, costs, secrets or production keys.
- **Important limit:** The tests validate tenant-scoping RLS, NOT genuine signed Auth sessions, revocation, reviewer separation or current live Supabase runtime-role impersonation. A user/tenant context GUC is not trustworthy authentication by itself; authenticated backend MUST enforce current active membership before setting it. The test fixture intentionally has an inactive membership visible within tenant scope; revocation is an application/auth gate, not implemented by these RLS predicates.

Next: safely provision actual test Auth principals through official Auth API with tightly controlled admin authorization, verify memberships/revocation in real staging, and then authorize restricted backend login only after acceptance.
