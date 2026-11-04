DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='proofline_stage_runtime') THEN CREATE ROLE proofline_stage_runtime NOLOGIN NOINHERIT; END IF; END $$;
REVOKE ALL ON SCHEMA public FROM proofline_stage_runtime;
GRANT USAGE ON SCHEMA proofline_private TO proofline_stage_runtime;
GRANT SELECT ON proofline_private.tenants,proofline_private.memberships,proofline_private.custody_events TO proofline_stage_runtime;
GRANT INSERT ON proofline_private.custody_events TO proofline_stage_runtime;
CREATE POLICY proofline_stage_tenant_read ON proofline_private.tenants FOR SELECT TO proofline_stage_runtime USING (true);
CREATE POLICY proofline_stage_membership_read ON proofline_private.memberships FOR SELECT TO proofline_stage_runtime USING (true);
CREATE POLICY proofline_stage_events_read ON proofline_private.custody_events FOR SELECT TO proofline_stage_runtime USING (true);
CREATE POLICY proofline_stage_events_insert ON proofline_private.custody_events FOR INSERT TO proofline_stage_runtime WITH CHECK (true);
