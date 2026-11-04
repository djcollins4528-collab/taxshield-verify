ALTER TABLE proofline_private.memberships
ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE proofline_private.memberships
ADD CONSTRAINT proofline_membership_real_auth_subject
CHECK (
  issuer = 'https://pgknyzwctmfqvlivlgpe.supabase.co/auth/v1'
  AND auth_user_id IS NOT NULL
  AND subject = auth_user_id::text
);
ALTER TABLE proofline_private.memberships
ALTER COLUMN auth_user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS membership_auth_user_lookup
ON proofline_private.memberships (auth_user_id,tenant_id,role)
WHERE active;
