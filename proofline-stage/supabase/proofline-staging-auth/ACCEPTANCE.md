# Proofline staged identity acceptance — 2026-11-03

- Dedicated Supabase project: `pgknyzwctmfqvlivlgpe`.
- Edge Function: `proofline-staging-auth`, version 1, ACTIVE, `verify_jwt=true`.
- Render sealed gateway: `proofline-sealed-staging`, deployment `dep-dbkrd8s9v7es73f5ob40`, LIVE.
- Render observed `proofline_auth_negative=denied` at 2026-11-03T10:26:10Z.
- A legacy anonymous project JWT did not obtain collector authorization.
- Database still has 1 synthetic-only tenant, 0 memberships, 0 custody events, 0 evidence, 0 checkpoints; restricted stage login remains NOLOGIN.
- 18 identity policy tests PASS (Node); previous backend regression 65 PASS (Python).

## Security boundary
The function checks a bearer token via Supabase Auth `getUser`, then uses a fixed parameterized server-only PostgreSQL query to require an ACTIVE membership matching the verified user ID, exact issuer, tenant ID and requested collector/reviewer/auditor role. Allowed tenant is hardcoded to one synthetic UUID. It has no evidence write routes.

`verify_jwt=true` is not sufficient on its own for user authentication: a legacy anonymous JWT can pass the outer platform check. The handler's live Auth service and membership lookup must succeed. No user metadata supplies authorization.

## Pending
No signed-in test account or active membership was provisioned. Positive user authorization and revocation checks have NOT been verified. This does not prove the complete collector -> reviewer -> checkpoint -> recovery workflow. Do not enable customer intake, billing, or real evidence submission.
