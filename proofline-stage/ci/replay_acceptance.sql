BEGIN;
CREATE FUNCTION pg_temp.denied(statement text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
 BEGIN
  EXECUTE statement;
  RAISE EXCEPTION 'unexpected success; roll back probe' USING ERRCODE='P0002';
 EXCEPTION
  WHEN insufficient_privilege OR check_violation THEN RETURN true;
  WHEN raise_exception THEN
   IF statement='SELECT proofline_private.require_staging_release_acceptance_v1()' THEN RETURN true; END IF;
   RAISE;
  WHEN SQLSTATE 'P0002' THEN RETURN false;
 END;
END $$;
CREATE TEMP TABLE results(name text,passed boolean);
CREATE TEMP TABLE fixture AS SELECT '{"classification":"SYNTHETIC_STAGING_ONLY","customer_deliverable":false,"report_status":"DRAFT_NOT_APPROVED","review":{"sign_off_status":"NOT_SIGNED"},"delivery_controls":{"customer_delivery_allowed":false},"executive_summary":{"release_recommendation":"DO_NOT_RELEASE"}}'::jsonb AS doc;
INSERT INTO proofline_private.report_artifacts(tenant_id,document_type,classification,source_snapshot,source_sha256)
SELECT 'bbbbaaaa-1111-4111-8111-000000000001','security_assessment_draft','SYNTHETIC_STAGING_ONLY',doc,
 encode(extensions.digest(convert_to(doc::text,'UTF8'),'sha256'),'hex') FROM fixture;
INSERT INTO results VALUES('valid_synthetic_report_inserted',true);
INSERT INTO results SELECT 'missing_key_'||key,pg_temp.denied(format(
 'INSERT INTO proofline_private.report_artifacts(tenant_id,document_type,classification,source_snapshot,source_sha256) VALUES(''bbbbaaaa-1111-4111-8111-000000000001'',''security_assessment_draft'',''SYNTHETIC_STAGING_ONLY'',%L,repeat(''b'',64))',doc-key))
FROM fixture CROSS JOIN unnest(ARRAY['classification','customer_deliverable','report_status','review','delivery_controls','executive_summary']) key;
INSERT INTO results SELECT 'json_null_rejected',pg_temp.denied(format(
 'INSERT INTO proofline_private.report_artifacts(tenant_id,document_type,classification,source_snapshot,source_sha256) VALUES(''bbbbaaaa-1111-4111-8111-000000000001'',''security_assessment_draft'',''SYNTHETIC_STAGING_ONLY'',%L,repeat(''b'',64))',jsonb_set(doc,'{customer_deliverable}','null'))) FROM fixture;
INSERT INTO results SELECT 'string_false_rejected',pg_temp.denied(format(
 'INSERT INTO proofline_private.report_artifacts(tenant_id,document_type,classification,source_snapshot,source_sha256) VALUES(''bbbbaaaa-1111-4111-8111-000000000001'',''security_assessment_draft'',''SYNTHETIC_STAGING_ONLY'',%L,repeat(''b'',64))',jsonb_set(doc,'{customer_deliverable}','"false"'))) FROM fixture;
INSERT INTO results VALUES('report_update_denied',pg_temp.denied('UPDATE proofline_private.report_artifacts SET source_sha256=repeat(''c'',64)'));
INSERT INTO results VALUES('report_delete_denied',pg_temp.denied('DELETE FROM proofline_private.report_artifacts'));
INSERT INTO results
SELECT 'truncate_'||t,pg_temp.denied(format('TRUNCATE proofline_private.%I CASCADE',t))
FROM unnest(ARRAY['membership_change_log','report_artifacts','report_review_decisions',
 'synthetic_acceptance_receipts','synthetic_http_rehearsals','custody_events']) t;
INSERT INTO results VALUES('missing_report_contract_rejected',pg_temp.denied($s$
 INSERT INTO proofline_private.report_artifacts(tenant_id,document_type,classification,source_snapshot,source_sha256)
 VALUES('bbbbaaaa-1111-4111-8111-000000000001','security_assessment_draft','SYNTHETIC_STAGING_ONLY','{}',repeat('a',64))
$s$));
INSERT INTO results VALUES('release_still_blocked',pg_temp.denied('SELECT proofline_private.require_staging_release_acceptance_v1()'));
INSERT INTO results SELECT 'all_private_tables_have_rls',bool_and(c.relrowsecurity)
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='proofline_private' AND c.relkind='r';
INSERT INTO results SELECT 'clients_have_no_private_write_or_read',NOT EXISTS(
 SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 CROSS JOIN unnest(ARRAY['anon','authenticated','service_role']) role
 CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE']) privilege
 WHERE n.nspname='proofline_private' AND c.relkind='r' AND has_table_privilege(role,c.oid,privilege));
SELECT json_agg(results) FROM results;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM results WHERE passed IS NOT TRUE) THEN
 RAISE EXCEPTION 'security acceptance failed'; END IF; END $$;
ROLLBACK;
