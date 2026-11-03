# Proofline hosted database diagnostic — verified 2026-11-03

## Deployed components
- Supabase project: `pgknyzwctmfqvlivlgpe` / `proofline-assurance-staging`
- Edge Function: `proofline-staging-health`, ACTIVE version 1, `verify_jwt=true`
- Render: `proofline-sealed-staging`, Free plan Virginia, auto-deploy disabled
- Render commit verified live: `cfbcdc3403f493ab607039821b0772ec4c910d54`
- Render startup log (2026-11-03 10:19:39 UTC): `proofline_upstream_staging_db=verified`
- Local pre-existing protected API regression tests: 65 PASS

## Verified property
Render made an HTTPS request to the JWT-required Supabase Edge Function; the Function used its Supabase-internal PostgreSQL connection to confirm that:
1. The custody append guard is enabled.
2. The independent review reference constraint exists.
3. The restricted Proofline staging login has LOGIN disabled.

The response contains only these control-state outcomes. No customer data, evidence, or report content is transmitted. Database row counts after the run: 1 synthetic-only tenant; 0 memberships, 0 evidence events, 0 evidence records, 0 audit records, 0 checkpoints.

## Critical limitations
- A legacy Supabase **anon JWT** is a publishable credential, not a verified user identity. `verify_jwt=true` alone is not operator authentication. This endpoint is a low-information diagnostic only.
- The Function uses its environment's server-side database URL; it is NOT exercising Proofline's restricted login, full FastAPI protected API, or customer tenant write path.
- Render remains sealed, all customer APIs deny writes, and live billing/intake remains disabled.
- The health check proves current guard presence, not complete cryptographic review-chain correctness, offsite recovery, access-control testing, or a penetration test.
- Do not expand this Edge Function to accept customer-supplied SQL, tenant IDs or evidence.
- Next: integrate a real OIDC identity provider and a per-tenant end-to-end synthetic acceptance test with independently verified reviewer separation; design an operator-only diagnostic token, not anon JWT.

## Source and release verification
Source: `proofline-stage/supabase/proofline-staging-health/index.ts` and `proofline-stage/server.py`.
Render deployment proof: `dep-dbkra6egekts73evabfg`. Supabase active function ID: `bb093355-9a5b-4f45-be64-c3e87046dcc6`.
