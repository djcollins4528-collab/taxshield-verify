# Official Supabase Auth two-user acceptance harness — 2026-11-03

**Implemented and CI verified (mocked). Real-user execution still pending. Production is SEALED.**

- Source: `proofline-stage/ci/live_auth_acceptance.mjs`.
- Tests: `proofline-stage/ci/live_auth_acceptance.test.mjs`.
- Workflow: `.github/workflows/proofline-auth-e2e.yml`.
- Manual provisioning and credential setup requirements: `proofline-stage/ci/LIVE_AUTH_ACCEPTANCE_RUNBOOK_20261103.md`.
- Pull request [#6](https://github.com/djcollins4528-collab/taxshield-verify/pull/6), squash merged to main in commit `fa64db8287ddff07f6b0257523887e3a37b08b75`.
- GitHub Actions [run 41735530797](https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41735530797): offline-tests **SUCCESS**, live-auth **SKIPPED intentionally** (manual-only).
- Offline tests cover configured project pinning, missing/wrong test accounts, two identities, collector/reviewer allowed and forbidden access, cross-tenant denial, fail-closed on missing memberships, role escalation, reused identity, and logout revocation error.
- The live runner uses official `/auth/v1/token?grant_type=password`, existing JWT-protected `/functions/v1/proofline-staging-auth/check` and `/auth/v1/logout?scope=local`, without creating accounts, assigning memberships or using a service-role key.
- Live test requires protected GitHub environment and credentials for two existing **noncustomer, dedicated test users**; this environment's protection configuration has **not** been established automatically. Configure it before manually triggering real tests.
- The live runner checks two distinct Supabase subjects; each is authorized for its specified role and forbidden the other; cross-tenant denial; revoked prior tokens denied with HTTP 401/403 (a 503 is NOT acceptance); unaffected remaining user; both sign-outs.
- Live Supabase staging postcheck: **0 auth.users, 0 auth.sessions, 0 memberships, 2 synthetic custody events, runtime login NOLOGIN**.
- Explicitly NOT verified: actual Supabase Auth session issuance, positive membership authorization, live revocation by sign-out or via membership disable; no test user provisioning available through connected Supabase tool. No user data/billing/paid infrastructure introduced.

**Decision: No customer activation.** Next human-authorized dependency: provision two genuine test accounts through official Supabase Auth Dashboard/Admin service; give them independently signed-in sessions and the required active memberships using privileged approved mechanisms, configure GitHub protected environment, then manually execute the live-auth job and inspect redacted CI evidence.
