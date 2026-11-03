# Proofline staging Auth session revocation gate — 2026-11-03

**Implementation: deployed. Offline/CI policy tests: PASS. Genuine two-account integration: BLOCKED / NOT VERIFIED. Production customer launch: NO-GO.**

## Delivered

- GitHub PR [#4](https://github.com/djcollins4528-collab/taxshield-verify/pull/4) merged via `913ec1ae0cb925d3fb2aca22eacd7d8d254f171b`.
- Staging Edge Function `proofline-staging-auth` deployed **ACTIVE version 3** with **verify_jwt=true**. This is a read-only synthetic-tenant authorization endpoint; no account provisioning, evidence submission, or billing route was opened.
- Authorization checks now require: (1) Supabase Auth `getUser(token)` verifies the token and user; (2) JWT payload **after verification** contains correct `iss`, `sub`, `aud`, authenticated role, `exp`, and UUID `session_id`; (3) live `auth.sessions` contains that session ID belonging to verified user with `not_after` absent or in the future; (4) active membership for exact synthetic tenant and requested role. Any missing or false condition denies authorization.
- Only the verification endpoint returns `authorized:true` when both live database predicates return true. Database queries are parameterized and use read-only SELECT. Credentials are read from existing runtime environment, never stored in GitHub.
- Deployed function contents independently read back and confirmed to contain `auth.sessions` check plus `matchesVerifiedSessionClaims`.

## Test evidence

- GitHub Actions run: https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41734082931
- `identity-policy`: **26 passed, 0 failed**, including expired tokens, wrong subject/issuer/audience, invalid or missing session ID, session absent and membership revoked.
- `sealed`: success.
- Supabase schema confirmed `auth.sessions.id`, `user_id`, `not_after`; Postgres administrative role can SELECT sessions.
- Final live staging state: zero `auth.users`, zero `auth.sessions`, zero memberships; two synthetic custody events; `proofline_stage_login` remains **NOLOGIN**.
- No cost, new paid infrastructure, live customer intake, public billing, or admin provisioning.

## Not yet proven

These are policy/unit assertions and a successful deployment, **not** an end-to-end sign-in and revocation acceptance test. Without genuine Supabase Auth users and active sessions we cannot prove the positive path, exact session deletion behavior, runtime DB URL privileges or session expiry behavior under real traffic. The existing endpoint may fail closed with HTTP 503 if its database URL is not configured. Do not claim live authorization works positively.

Use the official Supabase Auth API or Dashboard with tightly controlled test identities and authorized ownership. Only after verified real sessions should the restricted backend login and customer workflows be considered for promotion.

**Current decision: production SEALED.**
