# Owner-controlled Gmail alias integration — acceptance, 2026-11-03

**Status: integrated into owner-operated signup, live Auth runner and guarded SQL enrollment; hosted synthetic checks PASS; real Auth users not provisioned.**

## Implemented
- Shared role-specific mailbox validation in `test_mailbox_policy.mjs`.
- Existing `request_official_test_signups.mjs` now imports that policy for exactly pinned Supabase staging signup, requiring a verified owner base when using plus aliases and two different strong test passwords.
- Existing `live_auth_acceptance.mjs` imports the same policy. The real acceptance still requires two distinct official Supabase Auth user UUIDs, current live sessions, exact collector/reviewer memberships, and revoked-session denial.
- Existing `enroll_existing_auth_test_users.sql` now accepts **only either** two legacy dedicated prefix test addresses **or** collector/reviewer Gmail plus aliases sharing the exact local-part owner base. It still requires two existing confirmed, unbanned, nonanonymous genuine Auth user records, and refuses reenrollment.
- No Auth-user records have been fabricated and no database write was executed against live staging.

## Hosted verification
- Auth tests: [run 41746387013](https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41746387013) — **22 pass, 0 fail**; live two-user job deliberately skipped.
- Shared alias policy: [run 41746387005](https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41746387005) — **8 pass, 0 fail**.
- PostgreSQL 17: [run 41746387001](https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41746387001) — **success**, both legacy dedicated enrollment and paired Gmail aliases were accepted with matching confirmed synthetic users; mismatched owner rejected; encrypted synthetic recovery and other gates remained green.
- Sealed staging: [run 41746387030](https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41746387030) — success.

## Owner mailbox evidence
The connected Gmail inbox accepted delivery checks addressed to:
- `djcollins4528+proofline-collector-test@gmail.com`
- `djcollins4528+proofline-reviewer-test@gmail.com`

These are **two Auth email identifiers, not independent human reviewers**: both reach one owner-controlled inbox. Suitable for synthetic technical acceptance only; paid customer reviews require an independent authorized person and separation of duties.

## Operator-only flow (not executed)
Set `PROOFLINE_OWNER_EMAIL` to the owner Gmail base, plus `PROOFLINE_COLLECTOR_EMAIL` and `PROOFLINE_REVIEWER_EMAIL` to the two role aliases, each with distinct 16+ character passwords, `SUPABASE_URL` to the pinned staging URL, and `SUPABASE_PUBLISHABLE_KEY` to the existing modern **publishable**, not secret/admin, key. Do this only in a private shell. Run `node proofline-stage/ci/request_official_test_signups.mjs --request-confirmations` and independently verify both signup confirmations. Then run the guarded enrollment SQL in a controlled administrator session and the real `live_auth_acceptance.mjs` as appropriate. Do not commit passwords, Auth JWTs, mail confirmation links or database URLs.

**GitHub manual-run limitation:** `.github/workflows/proofline-auth-e2e.yml` currently does not inject `PROOFLINE_OWNER_EMAIL` into the live-auth job; a repository safety tool blocked the attempted environment edit. Therefore the manual GitHub workflow CANNOT yet certify owner-plus-alias users. Do not dispatch it with these aliases until this is fixed through a permitted repository edit. A local controlled runner can accept `PROOFLINE_OWNER_EMAIL` directly. The existing registered-user count has not changed.

**Production decision: NO-GO.** The unique-role DB policy remains active; staging runtime login, customer evidence intake and live payments remain disabled.
