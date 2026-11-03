-- Applied to proofline-assurance-staging (pgknyzwctmfqvlivlgpe).
-- A single Supabase Auth user must not simultaneously hold active
-- collector and reviewer roles for the same tenant.
-- A partial unique index is race-safe under concurrent grants.
CREATE UNIQUE INDEX IF NOT EXISTS proofline_active_operational_role_unique
ON proofline_private.memberships (tenant_id, auth_user_id)
WHERE active IS TRUE AND role IN ('collector','reviewer');
