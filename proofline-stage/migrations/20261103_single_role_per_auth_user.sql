-- Prevent a Supabase Auth identity from holding both collector and reviewer
-- memberships in the same tenant, including inactive duplicate-role rows.
-- Enforced by PostgreSQL independent of Edge Function or app checks.
ALTER TABLE proofline_private.memberships
  ADD CONSTRAINT proofline_single_role_per_user_per_tenant
  UNIQUE (tenant_id, auth_user_id);
