# Proofline changelog

## 2026-11-04
- Added operator-only real browser/API review acceptance; 25 checks passed and one
  changes_requested decision persisted, with immutable draft and release lock intact.
- Corrected stale production records to distinguish confirmed owner-controlled Auth
  acceptance from still-missing independent human review and end-to-end delivery.
- Recovered 37 recorded migrations; added isolated rebuild, live-catalog comparison,
  checksum manifest and 21 SQL/4 Python security acceptance assertions.
- Deployed five missing ledger TRUNCATE guards and complete report JSON constraint.
- Post-change live synthetic HTTP rehearsal passed 17/17 with cleanup confirmed.
- Identified historical repository and separated marketing, sealed gateway and live workbench.
- Recovered Vercel source with exact deployment-source hash matches (9dfdaec).
- Added Chromium/WebKit browser acceptance and session/error regression tests.
- Fixed sign-in focus, truthful logout, empty logout responses, expired sessions,
  bounded requests, error announcements and CSP-compatible review header styling.
- Generated Supabase workbench from the same frontend source to prevent drift.
- Fresh live synthetic report/CORS/revocation rehearsal passed 17/17; cleanup confirmed.
- Added current architecture, production status, blockers and broad release-gate records.
