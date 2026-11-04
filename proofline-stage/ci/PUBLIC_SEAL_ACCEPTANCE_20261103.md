# Proofline public seal acceptance
This is a **non-credentialed, non-customer** ingress check. The eight offline tests deliberately reject accidental readiness, evidence writes, anonymous Auth authorization and unavailable networks. The live GitHub Actions job then checks:
- Render GET /healthz => 200 + JSON state sealed/intake disabled
- Render GET /readyz => 503
- Render GET /v1/evidence => 403
- Render POST /v1/evidence => 403 with no request body
- Supabase staging proofline-staging-auth GET /check without a bearer => 401/403

Only known staging hosts are targeted. No secrets, real users, database passwords or evidence payloads are sent. This test verifies **continued closure**. It is not a live customer readiness certificate.

Supabase staging has 0 Auth users and 0 memberships, and its login stays NOLOGIN. The customer onboarding and payments remain OFF. The signed recovery, production keys, real Auth and legal launch prerequisites are separate gates.

If Render cold start or DNS prevents connection, the job **fails with NOT VERIFIED** instead of claiming a pass.
