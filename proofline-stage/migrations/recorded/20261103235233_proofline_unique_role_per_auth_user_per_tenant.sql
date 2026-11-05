ALTER TABLE proofline_private.memberships
  ADD CONSTRAINT proofline_single_role_per_user_per_tenant
  UNIQUE (tenant_id, auth_user_id);
