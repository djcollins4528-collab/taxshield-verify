# Positive identity acceptance gate — staged, NOT executed

Date: 2026-11-03

The current milestone is the first genuinely authenticated two-user role and revocation rehearsal.

## Implemented

- Dedicated private one-time-run table with primary-key replay prevention, RLS enabled, no public privileges.
- Supabase Edge Function one-time runner was temporarily deployed but could not be invoked: Render connector rejected secret injection.
- To eliminate the privileged public attack surface, the Edge Function was immediately replaced by an HTTP 410 sealed handler (version 2).
- Render startup's unactivated runner hook was removed in commit `b18b8adf73999caa32d828d33c16811df25cfb47`.
- Sanitized implementation and secure activation procedure were packaged as a local artifact (not published in this public repository).

## Verified live

- Auth users: 0
- Memberships: 0
- Acceptance runs: 0
- Custody evidence events: 0
- Synthetic tenants: 1
- One-time runner: sealed HTTP 410, not available for admin actions

## Limitations

No positive identity-user test ran and no customer workflow was activated. The provider rejected secret injection; do not bypass this by hard-coding a plaintext token or exposing an admin function. Use a trusted secret manager/interactive operator-approved deployment to run the synthetic test. Only then can the identity gate be considered passed.

The existing private evidence API remains unhosted; customer intake, payments and M365 real-tenant access remain disabled.
