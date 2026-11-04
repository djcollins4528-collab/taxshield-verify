CREATE POLICY proofline_runtime_base_membership_select ON proofline_private.memberships AS PERMISSIVE FOR SELECT TO proofline_stage_runtime USING (true);
CREATE POLICY proofline_runtime_base_tenant_select ON proofline_private.tenants AS PERMISSIVE FOR SELECT TO proofline_stage_runtime USING (true);
CREATE POLICY proofline_runtime_base_custody_select ON proofline_private.custody_events AS PERMISSIVE FOR SELECT TO proofline_stage_runtime USING (true);
CREATE POLICY proofline_runtime_base_custody_insert ON proofline_private.custody_events AS PERMISSIVE FOR INSERT TO proofline_stage_runtime WITH CHECK (true);
