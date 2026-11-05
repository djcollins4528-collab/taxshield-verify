# Followup workbench acceptance — 2026-11-04 (America/New_York)

Source commit: `ee49748ecb29f316515e36af7506bb817a3cfeeb` in PR #12.
This completes the synthetic workbench submission/history engineering step.
Genuine Auth followup acceptance and customer delivery remain unverified.

## Result

Confirmed collector/reviewer accounts can use the existing sign-in screen. The
new finding-history controls are separate from reviewer-only report retrieval.
The history API returns the caller's database-checked role and eligible immutable
change-request ID, along with the pinned draft digest. The browser uses those
values to prepare an append; the existing database trigger still enforces the
actual role/session and independent actor requirements. No client grants changed.

The browser shows the complete ordered evidence history and enables only the next
role's action: collector remediation, reviewer retest, then another collector attempt
if needed. All five retest outcomes remain available; INCONCLUSIVE is the default.
An attempt has no retest outcome. PASS never unlocks approval or delivery. Submission
requires a synthetic-only confirmation and complete observation/criterion/limitations.

History pagination prevents submitting from an incomplete view. Finding changes
clear stale history and inputs. Before sending an append the browser discards its
cursor; every uncertain outcome, conflict or timeout requires a fresh history read,
with no automatic mutation retries. Session expiry clears history/inputs and returns
focus to sign-in. Evidence is rendered as text; keyboard focus and status alerts
cover successful and failed operations.

## Verification

- CI on the exact source commit: all six triggered workflows passed.
- Browser suite: **60/60 Chromium/WebKit tests**; 34 new mocked followup cases,
  18 prior mocked UI cases and eight rendering cases across 1440/768/390/320px.
  New cases exercise collector/reviewer actions, preserved INCONCLUSIVE history,
  role gating, pagination, malformed contracts, conflict/network/timeout behavior,
  revoked sessions, finding changes, text-only rendering and mobile automated axe.
  These are UI/contract tests, not live Auth/database evidence or WCAG certification.
- [Browser CI run](https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41962372816).
- Local tests: 34 followup handler/policy/mocked database tests, 26 existing Auth
  policy tests, ten release-gate tests and four migration-inventory tests passed.
- Existing hosted isolated recovery, recorded database rebuild and release-lock
  workflows also passed. No migration was added or changed.
- Local browser binaries could not download; browser execution ran successfully
  on the existing hosted CI runner instead. Generated Edge HTML matches web sources.

## Staging deployment

Existing Vercel staging project deployment `dpl_HG5BacMad5bqKx1dTjkbMP1gnLRP`
is READY and serves `https://proofline-assurance-staging.vercel.app`.
Only its four web files were deployed, not the repository root. The provider's
`production` target is this staging alias; this was not a customer production launch.

Supabase `proofline-staging-followups` v2 is ACTIVE, platform JWT verification on,
bundle SHA-256 `1c2078c012a0e47ca8deaf99b119eaddeb00f1829686dc723bfe677d7390a4b7`.
The public static workbench endpoint is v5 ACTIVE, retaining its existing public
HTML configuration; its APIs still require Auth. Its bundle SHA-256 is
`055502a4d87dec14c45f7905a116cffa8b1e1d1eab977bf2d7cddbcfabfe8a66`.

Post-deployment HTTPS: HTML, CSS and JS each return 200 and match the tested source
bytes exactly, with no-store/nosniff headers. Missing and invalid bearer requests to
the deployed followup history route each return 401. Gateway denial does not prove
the downstream authenticated handler/DB path. No claim of genuine followup success
is made. The complete flow was not exercised against the deployed site with real
credentials in this cycle.

Live database observation: zero followup rows, zero sessions, two retained confirmed
users, all reports locked drafts; 16/16 private tables have RLS and zero client
private-table grants. Database preflight stays 6/9. Latest security advisor retains
13 expected informational private no-policy notices and the existing disabled
leaked-password-protection warning. No paid plan/configuration change was made.

Rollback: restore Vercel staging deployment `dpl_FvmA56H9BJ1NvWCrJEyDrzCnhJfP`
and Supabase workbench v4, then followup API v1 if needed. No stored ledger rows
need deletion or rewriting. Real acceptance remains the next uncompleted step.

See SALE_READINESS_DECISION.md for the customer-sale assessment. Customer intake,
live payments, customer data collection, approval and delivery remain disabled.
