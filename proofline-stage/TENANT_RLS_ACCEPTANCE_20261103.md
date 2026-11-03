# Runtime tenant isolation — staging acceptance (2026-11-03)

**Database migration applied and verified. Backend adapter updated locally. Production: NO-GO.**

Four RESTRICTIVE RLS policies now constrain the `proofline_stage_runtime` role:
- `tenants` SELECT: `id::text = current_setting('proofline.tenant_id', true)`
- `memberships` SELECT: `tenant_id::text = current_setting('proofline.tenant_id', true)`
- `custody_events` SELECT and INSERT: tenant ID must match that same transaction-local context.

Existing permissive policies remain in place but cannot bypass these restrictive conditions. Blank or missing context denies rows. A transaction-local `set_config(..., true)` avoids leaving tenant context on a pooled connection.

The private Python PostgreSQL adapter was updated to set the canonical tenant UUID inside each read or append transaction. Local backend suite: **94 tests passed** (including three new tenant-context tests). Full updated private backend is packaged separately; no database credentials or keys are stored in this public repository.

**Live metadata verified:** four policies of type RESTRICTIVE, staging role NOLOGIN; one synthetic tenant, two encrypted synthetic events, zero Auth users and memberships. A query with the wrong tenant context matched zero tenant IDs; the transaction was rolled back.

**Unverified:** The Supabase SQL management connection was denied permission to `SET ROLE proofline_stage_runtime`, so an actual RLS query from that restricted role has **not** passed yet. The custom GUC is defense in depth, not independently authenticated authorization: the application must validate the signed session and active tenant membership before setting it. A stolen DB connection can set GUCs.

No customer intake or payments enabled. Next: true Auth identities, restricted role acceptance, two-tenant crossover tests, and live backend onboarding controls.
