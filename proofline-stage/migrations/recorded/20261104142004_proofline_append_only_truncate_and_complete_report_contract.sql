-- Additive hardening only: no row deletion or permission expansion.
SET lock_timeout = '5s';
CREATE OR REPLACE FUNCTION proofline_private.reject_ledger_truncate_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$ BEGIN RAISE EXCEPTION 'append-only ledger cannot be truncated' USING ERRCODE='42501'; END $$;
REVOKE ALL ON FUNCTION proofline_private.reject_ledger_truncate_v1()
 FROM PUBLIC,anon,authenticated,service_role,proofline_stage_runtime,proofline_stage_login,supabase_auth_admin;
CREATE TRIGGER proofline_membership_log_no_truncate BEFORE TRUNCATE ON proofline_private.membership_change_log
 FOR EACH STATEMENT EXECUTE FUNCTION proofline_private.reject_ledger_truncate_v1();
CREATE TRIGGER proofline_report_artifacts_no_truncate BEFORE TRUNCATE ON proofline_private.report_artifacts
 FOR EACH STATEMENT EXECUTE FUNCTION proofline_private.reject_ledger_truncate_v1();
CREATE TRIGGER proofline_review_decisions_no_truncate BEFORE TRUNCATE ON proofline_private.report_review_decisions
 FOR EACH STATEMENT EXECUTE FUNCTION proofline_private.reject_ledger_truncate_v1();
CREATE TRIGGER proofline_acceptance_receipts_no_truncate BEFORE TRUNCATE ON proofline_private.synthetic_acceptance_receipts
 FOR EACH STATEMENT EXECUTE FUNCTION proofline_private.reject_ledger_truncate_v1();
CREATE TRIGGER proofline_http_receipts_no_truncate BEFORE TRUNCATE ON proofline_private.synthetic_http_rehearsals
 FOR EACH STATEMENT EXECUTE FUNCTION proofline_private.reject_ledger_truncate_v1();
ALTER TABLE proofline_private.report_artifacts ADD CONSTRAINT report_artifact_complete_contract
CHECK ((jsonb_typeof(source_snapshot)='object'
 AND source_snapshot->>'classification'='SYNTHETIC_STAGING_ONLY'
 AND source_snapshot->'customer_deliverable'='false'::jsonb
 AND source_snapshot->>'report_status'='DRAFT_NOT_APPROVED'
 AND source_snapshot#>>'{review,sign_off_status}'='NOT_SIGNED'
 AND source_snapshot#>'{delivery_controls,customer_delivery_allowed}'='false'::jsonb
 AND source_snapshot#>>'{executive_summary,release_recommendation}'='DO_NOT_RELEASE') IS TRUE);
