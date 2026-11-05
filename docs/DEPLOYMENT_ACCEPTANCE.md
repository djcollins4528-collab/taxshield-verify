# Staging deployment acceptance — 2026-11-04

Deployed source commit: ee8b0754930a531bfeff6a037472ddaef5c3f83f.
Vercel deployment dpl_FvmA56H9BJ1NvWCrJEyDrzCnhJfP: READY.
Alias: https://proofline-assurance-staging.vercel.app.
Supabase workbench: v4 ACTIVE; authentication setting unchanged.
All three served frontend assets exactly matched local deployed source text.

26/26 Playwright cases passed locally and against staging: 8 actual page-rendering
cases (Chromium/WebKit at 1440, 768, 390, 320 pixels), 18 mocked API UI regressions.
No horizontal overflow or axe WCAG-tag violations were observed. Mobile screenshot
was visually inspected. Manual screen-reader and genuine authenticated acceptance remain open.
Windows WebKit logs one native select-control style CSP warning even without DOM
style attributes; a diagnostic removing the select eliminated it. CSP was not weakened.
WebKit keyboard preferences also require explicit skip-link focus in automated tests.

Existing regression tests: 15 gateway Python, 7 public Python, 47 Node, all pass.
Live API rehearsal: 17/17, receipt a2873da6-de93-4621-ad9b-298f2f3cd73e.
Reviewer report returned 200, collector report access 403, tampered digest denied,
revoked collector denied, synthetic approval denied, cleanup confirmed.
Afterward: 0 users, 0 sessions, 0 active memberships. No database schema changed.

Production remains NO-GO (4/9 database preflight checks; 0/9 fully verified broad gates).
No paid resource, customer intake, live billing, customer system change, or outreach occurred.
Rollback: prior Vercel deployment dpl_3N7nuwjvY8U65GURj5P2XQdf5KNq and workbench v3.

Follow-up source recovery: all 14 active Edge Functions are now represented in the
repository. Existing Auth/health files matched deployed source; 11 missing functions
were recovered verbatim. The workbench is generated from shared frontend assets.
This is source recovery only, not certification of each recovered function or a full
schema/migration reconciliation. No recovered backend function was redeployed.

Hosted CI: commit 04493d7 passed browser tests and generated-source consistency check.
https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41842769701
Sealed staging CI also passed: https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41842769629
The initial ee8b075 CI run exposed a CRLF/LF generator mismatch; 04493d7 normalizes input line endings and passes. Later ba226cf changes inventory and documentation only.
