-- Disposable isolated PG only: fabricated Auth contracts, never hosted Auth acceptance.
BEGIN;
CREATE TEMP TABLE results(name text,passed boolean);
CREATE FUNCTION pg_temp.denied(statement text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
 BEGIN
  EXECUTE statement;
  RAISE EXCEPTION 'unexpected success' USING ERRCODE='P0002';
 EXCEPTION WHEN insufficient_privilege OR check_violation OR unique_violation OR not_null_violation THEN RETURN true;
 WHEN SQLSTATE 'P0002' THEN RETURN false;
 END;
END $$;
INSERT INTO auth.users(id,email,email_confirmed_at,is_anonymous) VALUES
 ('11111111-1111-4111-8111-111111111111','collector@example.invalid',now(),false),
 ('22222222-2222-4222-8222-222222222222','reviewer@example.invalid',now(),false);
SELECT proofline_private.enroll_staging_member_v1('11111111-1111-4111-8111-111111111111','collector');
SELECT proofline_private.enroll_staging_member_v1('22222222-2222-4222-8222-222222222222','reviewer');
INSERT INTO auth.sessions(id,user_id) VALUES
 ('11111111-1111-4111-8111-000000000001','11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-000000000002','22222222-2222-4222-8222-222222222222');
CREATE TEMP TABLE fixture AS WITH document AS (
 SELECT '{"classification":"SYNTHETIC_STAGING_ONLY","customer_deliverable":false,"report_status":"DRAFT_NOT_APPROVED","review":{"sign_off_status":"NOT_SIGNED"},"delivery_controls":{"customer_delivery_allowed":false},"executive_summary":{"release_recommendation":"DO_NOT_RELEASE"},"findings":[{"finding_id":"PL-SYN-001"},{"finding_id":"PL-SYN-002"}]}'::jsonb doc
), inserted AS (
 INSERT INTO proofline_private.report_artifacts(tenant_id,document_type,classification,source_snapshot,source_sha256)
 SELECT 'bbbbaaaa-1111-4111-8111-000000000001','security_assessment_draft','SYNTHETIC_STAGING_ONLY',doc,
 encode(extensions.digest(convert_to(doc::text,'UTF8'),'sha256'),'hex') FROM document RETURNING id
) SELECT id FROM inserted;
SELECT proofline_private.record_staging_review_decision_v1(a.id,'22222222-2222-4222-8222-222222222222',
 '22222222-2222-4222-8222-000000000002',a.source_sha256,'changes_requested','Synthetic changes required before re-evaluation.')
FROM proofline_private.report_artifacts a JOIN fixture f USING(id);
CREATE FUNCTION pg_temp.append_event(seq integer,kind text,actor uuid,session uuid,prev uuid DEFAULT NULL,
 outcome text DEFAULT NULL,finding text DEFAULT 'PL-SYN-002', tenant uuid DEFAULT 'bbbbaaaa-1111-4111-8111-000000000001',
 evidence jsonb DEFAULT '{"classification":"SYNTHETIC_STAGING_ONLY","customer_data":false,"observation":"SAMPLE synthetic observation only.","criterion":"Synthetic verification criterion only.","limitations":"No customer or production evidence verified."}')
RETURNS uuid LANGUAGE plpgsql AS $$ DECLARE result uuid; BEGIN
 INSERT INTO proofline_private.finding_followups(tenant_id,artifact_id,review_decision_id,artifact_sha256,finding_id,sequence,
 previous_id,kind,actor_id,session_id,outcome,evidence,evidence_sha256)
 SELECT tenant,a.id,d.id,a.source_sha256,finding,seq,prev,kind,actor,session,outcome,evidence,repeat('0',64)
 FROM fixture f JOIN proofline_private.report_artifacts a USING(id)
 JOIN proofline_private.report_review_decisions d ON d.artifact_id=a.id RETURNING id INTO result;
 RETURN result;
END $$;
CREATE TEMP TABLE chain AS SELECT pg_temp.append_event(1,'remediation','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-000000000001') AS remediation;
INSERT INTO results SELECT 'remediation_not_success',outcome IS NULL AND NOT customer_delivery_allowed
 FROM proofline_private.finding_followups;
INSERT INTO results SELECT 'digest_computed_from_evidence',evidence_sha256=encode(extensions.digest(convert_to(evidence::text,'UTF8'),'sha256'),'hex') FROM proofline_private.finding_followups;
INSERT INTO results SELECT 'collector_cannot_reverify',pg_temp.denied(format($s$SELECT pg_temp.append_event(2,'reverification','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-000000000001',%L,'PASS')$s$,remediation)) FROM chain;
INSERT INTO results SELECT 'reviewer_cannot_remediate',pg_temp.denied($s$SELECT pg_temp.append_event(1,'remediation','22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-000000000002')$s$);
INSERT INTO results SELECT 'missing_predecessor_denied',pg_temp.denied($s$SELECT pg_temp.append_event(2,'reverification','22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-000000000002',NULL,'PASS')$s$);
INSERT INTO results SELECT 'unknown_finding_denied',pg_temp.denied($s$SELECT pg_temp.append_event(1,'remediation','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-000000000001',NULL,NULL,'MISSING')$s$);
INSERT INTO results SELECT 'cross_tenant_denied',pg_temp.denied($s$SELECT pg_temp.append_event(1,'remediation','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-000000000001',NULL,NULL,'PL-SYN-002','ccccaaaa-2222-4222-8222-000000000002')$s$);
INSERT INTO results SELECT 'empty_evidence_denied',pg_temp.denied($s$SELECT pg_temp.append_event(1,'remediation','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-000000000001',NULL,NULL,'PL-SYN-002','bbbbaaaa-1111-4111-8111-000000000001','{}')$s$);
INSERT INTO results SELECT 'null_evidence_denied',pg_temp.denied($s$SELECT pg_temp.append_event(1,'remediation','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-000000000001',NULL,NULL,'PL-SYN-002','bbbbaaaa-1111-4111-8111-000000000001',NULL)$s$);
CREATE TEMP TABLE retest AS SELECT pg_temp.append_event(2,'reverification','22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-000000000002',remediation,'INCONCLUSIVE') id FROM chain;
INSERT INTO results SELECT 'invalid_outcome_denied',pg_temp.denied(format($s$SELECT pg_temp.append_event(2,'reverification','22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-000000000002',%L,'APPROVED')$s$,remediation)) FROM chain;
INSERT INTO results SELECT 'cross_finding_predecessor_denied',pg_temp.denied(format($s$SELECT pg_temp.append_event(2,'reverification','22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-000000000002',%L,'PASS','PL-SYN-001')$s$,remediation)) FROM chain;
INSERT INTO results SELECT 'sequence_gap_denied',pg_temp.denied(format($s$SELECT pg_temp.append_event(4,'reverification','22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-000000000002',%L,'PASS')$s$,remediation)) FROM chain;
INSERT INTO results SELECT 'duplicate_retest_denied',pg_temp.denied(format($s$SELECT pg_temp.append_event(2,'reverification','22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-000000000002',%L,'PASS')$s$,remediation)) FROM chain;
CREATE TEMP TABLE retry AS SELECT pg_temp.append_event(3,'remediation','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-000000000001',id) id FROM retest;
SELECT pg_temp.append_event(4,'reverification','22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-000000000002',id,'PASS') FROM retry;
INSERT INTO results SELECT 'history_retained_and_pass_does_not_release',count(*)=4 AND bool_and(NOT customer_delivery_allowed) AND count(*) FILTER(WHERE outcome='INCONCLUSIVE')=1 AND count(*) FILTER(WHERE outcome='PASS')=1 FROM proofline_private.finding_followups;
INSERT INTO results SELECT 'original_unchanged',a.status='draft' AND a.approved_at IS NULL AND NOT a.customer_delivery_allowed AND d.decision='changes_requested'
 FROM fixture f JOIN proofline_private.report_artifacts a USING(id) JOIN proofline_private.report_review_decisions d ON d.artifact_id=a.id;
INSERT INTO results VALUES('update_denied',pg_temp.denied('UPDATE proofline_private.finding_followups SET outcome=''PASS''')),
 ('delete_denied',pg_temp.denied('DELETE FROM proofline_private.finding_followups')),
 ('truncate_denied',pg_temp.denied('TRUNCATE proofline_private.finding_followups CASCADE'));
UPDATE proofline_private.memberships SET active=false WHERE auth_user_id='11111111-1111-4111-8111-111111111111';
INSERT INTO results SELECT 'revoked_membership_denied',pg_temp.denied($s$SELECT pg_temp.append_event(1,'remediation','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-000000000001',NULL,NULL,'PL-SYN-001')$s$);
UPDATE proofline_private.memberships SET active=true WHERE auth_user_id='11111111-1111-4111-8111-111111111111';
DELETE FROM auth.sessions WHERE user_id='11111111-1111-4111-8111-111111111111';
INSERT INTO results SELECT 'revoked_session_denied',pg_temp.denied($s$SELECT pg_temp.append_event(1,'remediation','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-000000000001',NULL,NULL,'PL-SYN-001')$s$);
INSERT INTO results SELECT 'no_client_privileges',NOT EXISTS(SELECT 1 FROM unnest(ARRAY['anon','authenticated','service_role','proofline_stage_runtime','proofline_stage_login']) r CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE']) p WHERE has_table_privilege(r,'proofline_private.finding_followups',p));
SELECT json_agg(results) FROM results;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM results WHERE passed IS NOT TRUE) THEN RAISE EXCEPTION 'followup acceptance failed'; END IF; END $$;
ROLLBACK;
