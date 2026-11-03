-- Bind runtime data access to a CURRENT, ACTIVE tenant membership.
-- Only a trusted backend may set proofline.auth_user_id after verifying a
-- signed Supabase Auth token. GUCs do not authenticate users independently.
-- Scope is transaction-local: SELECT set_config('proofline.auth_user_id', user_uuid, true).
CREATE POLICY proofline_runtime_membership_identity_read
 ON proofline_private.memberships AS RESTRICTIVE FOR SELECT
 TO proofline_stage_runtime
 USING (active AND auth_user_id::text = current_setting('proofline.auth_user_id',true));

CREATE POLICY proofline_runtime_tenant_active_member_read
 ON proofline_private.tenants AS RESTRICTIVE FOR SELECT
 TO proofline_stage_runtime
 USING (EXISTS (
  SELECT 1 FROM proofline_private.memberships m
  WHERE m.tenant_id = tenants.id
    AND m.active
    AND m.auth_user_id::text = current_setting('proofline.auth_user_id',true)
 ));

CREATE POLICY proofline_runtime_event_active_member_read
 ON proofline_private.custody_events AS RESTRICTIVE FOR SELECT
 TO proofline_stage_runtime
 USING (EXISTS (
  SELECT 1 FROM proofline_private.memberships m
  WHERE m.tenant_id = custody_events.tenant_id
    AND m.active
    AND m.auth_user_id::text = current_setting('proofline.auth_user_id',true)
 ));

CREATE POLICY proofline_runtime_event_active_role_insert
 ON proofline_private.custody_events AS RESTRICTIVE FOR INSERT
 TO proofline_stage_runtime
 WITH CHECK (
  actor = current_setting('proofline.auth_user_id',true)
  AND EXISTS (
   SELECT 1 FROM proofline_private.memberships m
   WHERE m.tenant_id = custody_events.tenant_id
     AND m.active
     AND m.auth_user_id::text = current_setting('proofline.auth_user_id',true)
     AND m.role = custody_events.role
  )
 );
