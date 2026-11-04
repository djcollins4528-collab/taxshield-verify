-- Prevent a single authenticated identity from acting as both collector
-- and reviewer in the same tenant, including concurrent role grants.
CREATE UNIQUE INDEX IF NOT EXISTS proofline_active_operational_role_unique
ON proofline_private.memberships (tenant_id, auth_user_id)
WHERE active IS TRUE AND role IN ('collector', 'reviewer');
