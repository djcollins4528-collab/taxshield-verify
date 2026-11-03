# Proofline production gate — November 2026
The public Proofline pages remain **informational prelaunch only**. The GitHub Actions suite checks local link targets, public navigation anchors, no checkout or forms, no inline executable JavaScript, demo honesty, prelaunch wording and secret-file exclusions. These tests are not a penetration test or a live deployment smoke test.
## Release controls
1. All public-site CI checks pass on the exact commit intended for release.
2. A human independently verifies the deployed pages and browser console, accessibility basics, HTTPS/CSP behavior and mobile layout.
3. Reconcile actual collector permissions and tenant identity in an explicitly authorized Microsoft development tenant; attach time-stamped evidence and limitations.
4. Confirm tenant isolation, encrypted storage, evidence access controls, reviewer sign-off, retention and independently tested recovery.
5. Obtain legal/insurance and commercial go/no-go approvals before live customer intake or billing. Do not treat this document as granting those approvals.
## Known limitations
- No authenticated live Graph observation has been verified in this ChatGPT session.
- Public static assets must not receive customer evidence or Graph tokens.
- The engine's offline tests and 29-test review-site rehearsal are not substitutes for production acceptance.
- Render may auto-deploy commits before CI completes. Branch protection or manual deployment gates are needed for a truly enforced CI-before-deploy policy.
