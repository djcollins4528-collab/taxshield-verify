# Proofline workbench browser acceptance

## Real staging decision acceptance (operator only)

`node live-review-acceptance.mjs` uses the existing approved credentials/environment
from `ci/live_auth_acceptance.mjs`. Set `PROOFLINE_RECORD_SYNTHETIC_REVIEW=yes` to opt
in to one permanent synthetic changes_requested decision on the pinned staging draft.
Set `PROOFLINE_ACCEPTANCE_OUTPUT` to an operator-selected JSON receipt path if needed.
Do not put credentials in Git, command arguments, traces or screenshots. This runner
is deliberately excluded from normal Playwright test discovery and CI; it requires
real accounts. Reruns verify the existing decision instead of mutating it. It closes
sessions even after assertion failures. Never delete the review to make a rerun pass.

## Rendering and mocked UI regression suite

Run `npm ci`, `npx playwright install chromium webkit`, then `npm test` here.
Default target is the local recovered workbench with its real CSP headers.
Set PROOFLINE_BROWSER_URL to https://proofline-assurance-staging.vercel.app for deployed acceptance.
The 8 rendering cases use the actual target assets. The other 18 cases intercept
Auth/report HTTP calls with explicitly synthetic fixtures; they prove UI behavior,
not live authentication, tenant isolation, or a customer journey.
No credentials, persistent sessions, or traces are recorded. Results and screenshots
are written to results/. Automated axe results do not establish WCAG conformance.
WebKit on Windows uses different default keyboard navigation preferences; the skip
link is explicitly focused before Enter. Full Safari hardware acceptance remains open.
Windows WebKit also emits a native select-control CSP style warning with no inline
DOM style attributes; the policy remains strict. See docs/DEPLOYMENT_ACCEPTANCE.md.

Edit ../web/; run `npm run build:edge` to regenerate the existing Supabase HTML endpoint.
Only deploy those four web files to the existing Proofline staging Vercel project.
Never deploy the repository root: it contains unrelated TaxShield assets.
The Vercel project's production target is the staging alias, not customer production.
Rollback frontend to deployment dpl_3N7nuwjvY8U65GURj5P2XQdf5KNq if needed;
restore Supabase workbench version 3 for a coordinated rollback. Backend APIs are unchanged.
