# Active Auth-identity-shaped membership + revocation RLS — November 3, 2026

**Staging DB policies APPLIED, hosted synthetic restricted-role test PASSED, real Auth-user acceptance PENDING, production remains SEALED.**

## Implementation
- Four new PostgreSQL **RESTRICTIVE** policies for `proofline_stage_runtime`: membership SELECT active/self; tenant SELECT active membership; custody SELECT active membership; custody INSERT requires tenant, active role, actor equals scoped user UUID. These work in addition to the four existing restrictive tenant-isolation policies.
- Source: `proofline-stage/migrations/20261103_runtime_active_membership_guard.sql`.
- Important: `proofline.auth_user_id` and `proofline.tenant_id` are *not* authentication. Only a verified backend session may set them transaction-locally, and an exposed SQL connection would be able to spoof them.
- Private Python PostgreSQL adapter updated with parameterized transaction-local user context for signed Auth-shaped UUIDs; invalid membership lookup subjects fail closed; no private secrets were committed.
- Local Python tests: **97 PASSED**, including three new subject/context tests.

## Verified hosted PostgreSQL 17
- Workflow https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41733224398 — **completed SUCCESS**
- Job `126255660149` / step `Verify active membership, role and revocation under restricted DB identity` **success**.
- Two synthetic UUID identities and two synthetic tenants: no context blocked; active collector/reviewer access allowed only in correct roles, cross-tenant reads and inserts blocked, actor spoof blocked, reviewer escalation blocked, revocation blocked next-transaction access. No fixture writes persisted.
- Sealed staging workflow https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41733224359 — **success**.
- Verification PR https://github.com/djcollins4528-collab/taxshield-verify/pull/3 merged to main in commit `3ee467b0e4ad5a2072040bd6f6e77fa0c2922b75`.

## Live Supabase post-check
- Four new restrictive RLS policy definitions inspected via pg_policies and found installed.
- 1 synthetic tenant; 2 encrypted synthetic custody events; 0 genuine Auth users; 0 memberships; `proofline_stage_login` remains **NOLOGIN**.
- Security advisor only reported INFO on RLS-enabled, no-policy private tables, consistent with deny-by-default design.

## Release blocking items
- No actual valid signed Supabase Auth collector/reviewer sessions were created; no official Auth-user provisioning connector is available and direct auth.users SQL writes would be inappropriate.
- No verified live privileged session revocation checks against auth.sessions. The hosted SQL test models **membership revocation** only.
- The restricted PostgreSQL role has not been used from the live staging service as a genuine independent connection. Durable key custody, protected offsite storage and real end-to-end service remain pending.
- Customer intake, production evidence API and live Stripe payments remain disabled. No new infrastructure fees.
