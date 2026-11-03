# Proofline official Auth readiness and protected positive-path harness — 2026-11-03

**Hosted readiness gate: PASS. Genuine test-account sign-in: NOT YET EXECUTED. Production: NO-GO.**

## Verified staging public Auth configuration

- Project: `pgknyzwctmfqvlivlgpe`; official `GET /auth/v1/settings`.
- Public email signup: **enabled** (`disable_signup=false`, email provider enabled).
- Email auto-confirm: **disabled** (`mailer_autoconfirm=false`). Official email confirmation must complete before positive testing.
- Unauthenticated `GET /functions/v1/proofline-staging-auth/check?...role=collector` returned HTTP **401**.
- Hosted proof: [GitHub Actions run 41735210149](https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41735210149), completed success, **5** mock-only positive-harness tests passed and public readiness probe passed.
- Earlier read-only probe: run `41734754837`, also successful.
- PR [#5](https://github.com/djcollins4528-collab/taxshield-verify/pull/5) squash-merged into main commit `34768118a8396066a0656d17ed3da3d7c1e5fe08`.

## New protected integration harness

- `proofline-stage/ci/positive_auth_acceptance.py` performs official `/auth/v1/token?grant_type=password` sign-in using supplied distinct test-only collector/reviewer emails and passwords, obtains signed access tokens only in memory, and verifies correct role returns 200, wrong role returns 403 and cross-tenant context returns 403.
- `.github/workflows/proofline-auth-positive.yml` is **manual workflow_dispatch only**. All test-only credentials are accessed as five encrypted GitHub Actions secrets; it never creates accounts or uses service-role credentials.
- `proofline-stage/ci/test_positive_auth_acceptance.py`: 5 offline tests for fail-closed missing credentials, no service key, duplicate identities, correct authorization matrix, and denial of correct role.
- None of the real account emails, passwords, access tokens, refresh tokens, private keys or service-role secrets are committed.

## Blockers and limitations

The GitHub integration cannot create GitHub Actions secrets or issue official Supabase Auth users on behalf of the user. Supabase email confirmation is required, so real test accounts must be securely created and email-confirmed through supported Supabase Auth signup or the Dashboard before the manual workflow can pass. The integration harness **has not been executed with real identities** and it does not test membership revocation; the latter needs controlled test lifecycle with a fresh token and active membership state change.

Final live Supabase check: **0 Auth users, 0 Auth sessions, 0 memberships, 2 synthetic custody events, `proofline_stage_login` NOLOGIN**. Customer evidence intake and payments remain disabled. No additional billed infrastructure created.

Next: establish two verified, separate Auth test identities, provision collector/reviewer memberships through an authorized admin path, set GitHub protected test secrets without exposing passwords, execute the manual test, test revocation, and securely clean up test users afterward.
