# Proofline changelog

## 2026-11-04
- Identified historical repository and separated marketing, sealed gateway and live workbench.
- Recovered Vercel source with exact deployment-source hash matches (9dfdaec).
- Added Chromium/WebKit browser acceptance and session/error regression tests.
- Fixed sign-in focus, truthful logout, empty logout responses, expired sessions,
  bounded requests, error announcements and CSP-compatible review header styling.
- Generated Supabase workbench from the same frontend source to prevent drift.
- Fresh live synthetic report/CORS/revocation rehearsal passed 17/17; cleanup confirmed.
- Added current architecture, production status, blockers and broad release-gate records.
