# Confirmed owner-controlled Auth acceptance — 2026-11-04

Both owner-approved Gmail role aliases were confirmed through official Supabase
emails. The user's browser then attempted localhost:3000; direct database inspection
confirmed that both email verifications had succeeded. On 2026-11-04, the Supabase
 dashboard Site URL was changed to https://proofline-assurance-staging.vercel.app
and verified after a full reload. No wildcard redirect URLs were added. Existing
confirmations were not repeated; this verifies saved configuration, not a new email flow.

The existing guarded enrollment SQL assigned distinct collector/reviewer roles to
the two confirmed, unbanned, nonanonymous Auth subjects. No Auth confirmation field
was changed by SQL. Passwords remain DPAPI-encrypted in local operator storage outside
Git; no password, token or confirmation URL is included here.

Observed live API results: 9/9 assertions passed using the existing
`ci/live_auth_acceptance.mjs`: authorized roles, cross-role denials, cross-tenant
denials, collector logout/revocation, unaffected reviewer, reviewer logout/revocation.

Actual Chromium and WebKit browser runs (no API mocks): both roles signed in;
collector report retrieval returned 403, reviewer retrieval returned 200 and rendered
the synthetic report. Sign-in/report focus and confirmed server logout passed.
Afterward: zero Auth sessions, two active role memberships intentionally retained.

Database preflight is 6/9 after sign-out. Live sessions and database-recorded live
acceptance remain false. Do not keep sessions open or insert acceptance markers merely
to make this indicator green. Owner-controlled aliases prove distinct Auth identities
and role enforcement, not independent human review or production customer acceptance.

Customer intake, live payments and report delivery remain locked. The next delivery
milestone is an authorized synthetic engagement through review, remediation,
reverification and delivery, with payment simulation and independent review acceptance.
