-- Runtime tenant scope is transaction-local and must be supplied by
-- the authenticated backend after checking tenant membership.
-- Missing/blank or unrelated values deny all rows; no UUID cast errors.
CREATE POLICY proofline_runtime_tenant_read_guard
  ON proofline_private.tenants AS RESTRICTIVE
  FOR SELECT TO proofline_stage_runtime
  USING (id::text = current_setting('proofline.tenant_id', true));
CREATE POLICY proofline_runtime_memberships_read_guard
  ON proofline_private.memberships AS RESTRICTIVE
  FOR SELECT TO proofline_stage_runtime
  USING (tenant_id::text = current_setting('proofline.tenant_id', true));
CREATE POLICY proofline_runtime_custody_read_guard
  ON proofline_private.custody_events AS RESTRICTIVE
  FOR SELECT TO proofline_stage_runtime
  USING (tenant_id::text = current_setting('proofline.tenant_id', true));
CREATE POLICY proofline_runtime_custody_write_guard
  ON proofline_private.custody_events AS RESTRICTIVE
  FOR INSERT TO proofline_stage_runtime
  WITH CHECK (tenant_id::text = current_setting('proofline.tenant_id', true));
