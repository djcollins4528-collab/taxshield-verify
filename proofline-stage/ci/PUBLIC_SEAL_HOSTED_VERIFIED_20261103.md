# Public sealed-ingress acceptance — 2026-11-03

**Result: PASS — public customer-facing routes are still sealed. Production launch: NO-GO.**

## Verified actual deployed services
GitHub-hosted, uncredentialed HTTP job:
https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41744532331

- `GET https://proofline-sealed-staging.onrender.com/healthz` — **HTTP 200**, response JSON confirms `state=sealed` and `intake=disabled`.
- `GET https://proofline-sealed-staging.onrender.com/readyz` — **HTTP 503**, `ready=false`.
- `GET https://proofline-sealed-staging.onrender.com/v1/evidence` — **HTTP 403**, customer read denied.
- `POST https://proofline-sealed-staging.onrender.com/v1/evidence` — **HTTP 403**, customer evidence write denied (no body or customer data sent).
- `GET https://pgknyzwctmfqvlivlgpe.supabase.co/functions/v1/proofline-staging-auth/check?tenant=bbbbaaaa-1111-4111-8111-000000000001&role=collector` **without a bearer** — **HTTP 401**, anonymous authorization denied.
- Hosted `offline fail-closed checks` job `126294092445`: **8 tests PASSED, 0 failed**.
- Hosted `live anonymous denial checks` job `126294165884`: **completed SUCCESS**; logged **SEALED_CONFIRMED (5 public probes)**.
- PR [#9](https://github.com/djcollins4528-collab/taxshield-verify/pull/9) merged into `main` at `48503ad22a244cd63310525ee2aaf992cd1ec342`.

## Continuous regression protection
Workflow: `.github/workflows/proofline-public-seal.yml`; implementation: `proofline-stage/ci/public_seal_smoke.mjs`; tests: `proofline-stage/ci/public_seal_smoke.test.mjs`.

On changes to this test or its workflow, GitHub runs the eight local negative/security cases then tests the real staged public ingress. The endpoint list is pinned, requests contain no passwords/tokens or customer evidence, and any missing network result or unexpected access **fails closed**. The job confirms sealed behavior, not customer product acceptance.

## Limits
- No genuine two-user Auth positive sign-in or membership revocation integration test yet.
- It does NOT prove backend custody submission, customer onboarding, real payments, business authorization, independent production key custody, offsite retention or recovery.
- Free Render service might be subject to cold starts: missing availability results in **NOT VERIFIED**, not a passing check.
- No public sites were changed, and no real user data or live payment flow was enabled.

**Production decision: HOLD.**
