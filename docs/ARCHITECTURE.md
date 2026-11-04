# Proofline architecture — inspected 2026-11-04

Scope: Proofline only. TaxShield root assets are unrelated and unchanged.
Repository: djcollins4528-collab/taxshield-verify, starting main f329080.
proofline/ is the prelaunch marketing site; proofline-stage/ contains the sealed
Python gateway, migrations, Auth policy, recovery tests and release controls.
The private custody engine is described as separately packaged; it is not present
in this checkout. Do not replace it or claim its deployment from these files.

Confirmed active topology:
- Vercel project prj_aS5jj8hbUd7eRA6WtYsJuCR1uqz7, team team_s8Ehik5JW9JKk20Lc3PoQL8S.
- Alias https://proofline-assurance-staging.vercel.app serves a static reviewer workbench.
- No Git linkage was returned. The live workbench was missing from main; its three
  assets were recovered with SHA-1 matches to the Vercel source tree, commit 9dfdaec.
- Supabase pgknyzwctmfqvlivlgpe, proofline-assurance-staging, ACTIVE_HEALTHY, US East.
- Browser password sign-in uses Supabase Auth and a publishable key; access token is
  memory-only. Protected report and decision functions validate Auth, live session,
  fixed synthetic tenant and active reviewer membership on every request.
- Report read v5 checks SHA-256 of stored PostgreSQL JSON before responding. Errors
  return generic 503 categories, never database credentials. Approval/delivery are locked.
- 14 deployed Edge Functions and 15 proofline_private tables were inventoried.
  All 15 tables have RLS; client private-table grants are absent. Twelve tables have
  informational no-policy notices consistent with deny-by-default private access.
- Required server environment names observed: SUPABASE_URL, SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL. Values were not exported.
- Existing Render gateway is historically sealed; its current state is not reverified.

CI exists for public pages, sealed gateway, Auth policy, enrollment, recovery,
release decisions and Chromium/WebKit regressions. All 14 active Edge Functions are
now recovered or matched to source; schema/migration reconciliation is still needed.
No new framework, paid service, database, Git linkage or customer tenant was created.
