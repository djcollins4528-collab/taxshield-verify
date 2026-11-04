# Proofline — owner-controlled genuine Auth signup preflight

## Purpose
Safely request Supabase Auth email confirmation for the two independent test-only accounts required by the existing live Auth acceptance workflow. This is an **operator command**, not an HTTP service and not a privileged account creation endpoint.

## Requirements
- Two distinct owner-controlled mailbox addresses matching `proofline-collector-test*@...` and `proofline-reviewer-test*@...`.
- Two distinct strong passwords (16+ chars).
- Supabase staging publishable key, **not** a service-role, database or secret API key.
- Set the six `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PROOFLINE_COLLECTOR_EMAIL`, `PROOFLINE_COLLECTOR_PASSWORD`, `PROOFLINE_REVIEWER_EMAIL`, `PROOFLINE_REVIEWER_PASSWORD` environment variables in a private operator terminal.

## Execute
```sh
node proofline-stage/ci/request_official_test_signups.mjs --request-confirmations
```

The command is a no-network error by default. It refuses the wrong Supabase project, nondedicated mailboxes, identical accounts/passwords and nonpublishable keys. It never prints tokens or passwords. A successful Auth signup response **does not prove** that a real Auth user was created, especially when email enumeration protection applies. Both test mailboxes must be independently confirmed, and genuine Auth users must be verified through official Supabase Auth Dashboard before enrollment.

After confirmation, use the existing guarded `proofline-stage/ci/enroll_existing_auth_test_users.sql` in a protected DBA session to assign separate roles. Then configure the protected GitHub environment and execute the manual `Proofline live Auth acceptance` workflow on `main`. The project remains sealed until that run succeeds.

## Not yet performed
No live signup request was made, because no owner-controlled test mailbox addresses or passwords were available. There are no genuine Auth users or memberships verified. No new public account-creation endpoint was deployed and no billing was enabled.
