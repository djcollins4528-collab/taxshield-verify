# Proofline — Genuine Supabase Auth acceptance gate

**Purpose:** Execute the missing positive two-user sign-in/revocation test against Proofline's pinned staging project, using the supported GoTrue Auth API. No user creation, database writes, privileged tokens, public customer intake, or payments.

## Automated verification
- PR and push run **mocked** HTTP tests via `node --test proofline-stage/ci/live_auth_acceptance.test.mjs`.
- The **real** test is a manual `workflow_dispatch` job on `main` only, with environment `proofline-auth-acceptance`. Configure GitHub environment reviewers/protection before running; its environment secrets must include:
  - `PROOFLINE_STAGING_PUBLISHABLE_KEY` (public-key class only; never service-role)
  - `PROOFLINE_COLLECTOR_EMAIL`, `PROOFLINE_COLLECTOR_PASSWORD`
  - `PROOFLINE_REVIEWER_EMAIL`, `PROOFLINE_REVIEWER_PASSWORD`
- Test account emails MUST match `proofline-collector-test*@...` and `proofline-reviewer-test*@...`, be different, and be verified, **existing** Supabase Auth users in project `pgknyzwctmfqvlivlgpe`. Use independent strong passwords.
- Through the authenticated Supabase Dashboard or other official authorized Auth admin workflow, create **only these synthetic test accounts**; the current connected Supabase management interface cannot provision Auth users safely.
- Create two ACTIVE `proofline_private.memberships` records with those actual `auth.users.id` UUIDs, issuer `https://pgknyzwctmfqvlivlgpe.supabase.co/auth/v1`, subject identical to `auth_user_id::text`, tenant `bbbbaaaa-1111-4111-8111-000000000001`, roles `collector` and `reviewer` respectively. This step is not automated until official Auth provisioning and test-user UUIDs are available. Never invent Auth users or bypass the schema's FK.
- Keep `proofline_stage_login` NOLOGIN, and customer intake, evidence writes, and payment processing disabled.

## Real test acceptance
1. Password sign-in using the official Supabase Auth endpoint for **both** independently verified subjects, with no account creation.
2. Collector check must return 200; reviewer role for collector 403.
3. Reviewer check must return 200; collector role for reviewer 403.
4. Cross-tenant access for both must return 403.
5. Perform local logout for collector; previously valid token must return 401 or 403 (a 503 is **not** acceptance).
6. Reviewer must still return 200; logout reviewer and ensure its prior session returns 401 or 403.
7. Sign out any remaining test sessions in `finally`. Never print JWTs/passwords or response bodies.

**Failure is expected** until exact GitHub environment secrets and real Auth test users/memberships are configured. No automated workflow dispatch was performed. This gate does not itself test disabling a membership in the middle of a session; prior hosted SQL tests covered synthetic membership revocation but the real-life revocation event requires authorized admin support.

## Current decision
Protected automation implemented; *genuine positive/negative live Auth execution pending*. No production launch until actual run shows success.
