
CREATE OR REPLACE FUNCTION proofline_private.enroll_staging_member_v1(
  p_auth_user_id uuid,
  p_role text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
DECLARE
  v_tenant_id constant uuid := 'bbbbaaaa-1111-4111-8111-000000000001';
  v_membership_id uuid;
  v_existing_role text;
BEGIN
  IF p_auth_user_id IS NULL OR p_role IS NULL OR p_role NOT IN ('collector','reviewer','auditor') THEN
    RAISE EXCEPTION 'invalid staging enrollment' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM proofline_private.tenants
    WHERE id=v_tenant_id AND environment='staging'
  ) THEN
    RAISE EXCEPTION 'staging tenant unavailable' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id=p_auth_user_id AND u.is_anonymous IS FALSE
      AND u.email_confirmed_at IS NOT NULL
      AND (u.banned_until IS NULL OR u.banned_until <= now())
  ) THEN
    RAISE EXCEPTION 'confirmed non-anonymous staging Auth user required' USING ERRCODE='42501';
  END IF;

  SELECT id,role INTO v_membership_id,v_existing_role
  FROM proofline_private.memberships
  WHERE tenant_id=v_tenant_id AND auth_user_id=p_auth_user_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_role<>p_role THEN
      RAISE EXCEPTION 'existing membership has a different role; role changes need separate review' USING ERRCODE='42501';
    END IF;
    RAISE EXCEPTION 'membership already exists; reactivation requires separate review' USING ERRCODE='42501';
  END IF;

  v_membership_id := gen_random_uuid();
  INSERT INTO proofline_private.memberships
    (id,tenant_id,issuer,subject,role,active,auth_user_id)
  VALUES
    (v_membership_id,v_tenant_id,
     'https://pgknyzwctmfqvlivlgpe.supabase.co/auth/v1',
     p_auth_user_id::text,p_role,true,p_auth_user_id);
  RETURN v_membership_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION proofline_private.revoke_staging_member_v1(
  p_auth_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
DECLARE
  v_changed integer;
BEGIN
  IF p_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user ID required' USING ERRCODE='22023';
  END IF;
  UPDATE proofline_private.memberships
  SET active=false
  WHERE tenant_id='bbbbaaaa-1111-4111-8111-000000000001'::uuid
    AND auth_user_id=p_auth_user_id AND active=true;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  RETURN v_changed>0;
END;
$fn$;
REVOKE ALL ON FUNCTION proofline_private.enroll_staging_member_v1(uuid,text) FROM PUBLIC,anon,authenticated,service_role,proofline_stage_runtime;
REVOKE ALL ON FUNCTION proofline_private.revoke_staging_member_v1(uuid) FROM PUBLIC,anon,authenticated,service_role,proofline_stage_runtime;
