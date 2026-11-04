# Proofline workbench browser acceptance

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
