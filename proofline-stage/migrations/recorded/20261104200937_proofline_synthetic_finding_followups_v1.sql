-- Internal staging ledger only. No API grants, report mutation or release approval.
SET lock_timeout='5s';
CREATE TABLE proofline_private.finding_followups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES proofline_private.tenants(id),
 artifact_id uuid NOT NULL REFERENCES proofline_private.report_artifacts(id),
 review_decision_id uuid NOT NULL REFERENCES proofline_private.report_review_decisions(id),
 artifact_sha256 text NOT NULL CHECK(artifact_sha256 ~ '^[0-9a-f]{64}$'),
 finding_id text NOT NULL CHECK(length(finding_id) BETWEEN 1 AND 100),
 sequence integer NOT NULL CHECK(sequence>0),
 previous_id uuid REFERENCES proofline_private.finding_followups(id),
 kind text NOT NULL CHECK(kind IN ('remediation','reverification')),
 actor_id uuid NOT NULL REFERENCES auth.users(id),
 session_id uuid NOT NULL,
 outcome text,
 evidence jsonb NOT NULL CHECK(octet_length(evidence::text)<=16384),
 evidence_sha256 text NOT NULL CHECK(evidence_sha256 ~ '^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 classification text NOT NULL DEFAULT 'SYNTHETIC_STAGING_ONLY' CHECK(classification='SYNTHETIC_STAGING_ONLY'),
 customer_delivery_allowed boolean NOT NULL DEFAULT false CHECK(customer_delivery_allowed=false),
 CHECK((kind='remediation' AND outcome IS NULL) OR
       (kind='reverification' AND outcome IS NOT NULL AND outcome IN ('PASS','FAIL','INCONCLUSIVE','NOT_TESTED','NOT_APPLICABLE'))),
 UNIQUE(artifact_id,finding_id,sequence),
 UNIQUE(previous_id)
);
ALTER TABLE proofline_private.finding_followups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON proofline_private.finding_followups FROM PUBLIC,anon,authenticated,service_role,proofline_stage_runtime,proofline_stage_login,supabase_auth_admin;

CREATE FUNCTION proofline_private.guard_finding_followup_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $fn$
DECLARE
 a proofline_private.report_artifacts%rowtype;
 d proofline_private.report_review_decisions%rowtype;
 p proofline_private.finding_followups%rowtype;
 required_role text;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'followups are append-only' USING ERRCODE='42501'; END IF;
 -- Serialize a finding's append attempts through its immutable parent artifact.
 SELECT * INTO a FROM proofline_private.report_artifacts WHERE id=NEW.artifact_id FOR UPDATE;
 IF NOT FOUND OR a.tenant_id<>NEW.tenant_id
 OR a.tenant_id<>'bbbbaaaa-1111-4111-8111-000000000001'::uuid
 OR a.classification<>'SYNTHETIC_STAGING_ONLY' OR a.status<>'draft'
 OR a.customer_delivery_allowed OR a.approved_at IS NOT NULL
 OR a.source_sha256<>NEW.artifact_sha256
 OR a.source_sha256<>encode(extensions.digest(convert_to(a.source_snapshot::text,'UTF8'),'sha256'),'hex')
 THEN RAISE EXCEPTION 'original synthetic artifact required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(a.source_snapshot->'findings') f WHERE f->>'finding_id'=NEW.finding_id)
 THEN RAISE EXCEPTION 'original finding required' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM proofline_private.report_review_decisions WHERE id=NEW.review_decision_id;
 IF NOT FOUND OR d.artifact_id<>a.id OR d.tenant_id<>NEW.tenant_id
 OR d.artifact_sha256<>a.source_sha256 OR d.decision<>'changes_requested'
 THEN RAISE EXCEPTION 'matching change request required' USING ERRCODE='42501'; END IF;
 required_role:=CASE NEW.kind WHEN 'remediation' THEN 'collector' WHEN 'reverification' THEN 'reviewer' ELSE NULL END;
 IF NOT EXISTS(SELECT 1 FROM proofline_private.memberships m JOIN auth.users u ON u.id=m.auth_user_id
 JOIN auth.sessions s ON s.user_id=u.id
 WHERE m.tenant_id=NEW.tenant_id AND m.auth_user_id=NEW.actor_id AND m.active
 AND m.role=required_role AND m.subject=u.id::text
 AND m.issuer='https://pgknyzwctmfqvlivlgpe.supabase.co/auth/v1'
 AND u.is_anonymous IS FALSE AND u.email_confirmed_at IS NOT NULL
 AND (u.banned_until IS NULL OR u.banned_until<=now())
 AND s.id=NEW.session_id AND (s.not_after IS NULL OR s.not_after>now()))
 THEN RAISE EXCEPTION 'active confirmed role and live session required' USING ERRCODE='42501'; END IF;
 IF NEW.kind='remediation' AND NEW.actor_id=d.reviewer_user_id THEN
 RAISE EXCEPTION 'reviewer cannot remediate own review' USING ERRCODE='42501'; END IF;
 IF NEW.sequence=1 THEN
  IF NEW.previous_id IS NOT NULL OR NEW.kind<>'remediation' THEN
   RAISE EXCEPTION 'first event must be remediation' USING ERRCODE='42501'; END IF;
 ELSE
  SELECT * INTO p FROM proofline_private.finding_followups WHERE id=NEW.previous_id;
  IF NOT FOUND OR p.artifact_id<>NEW.artifact_id OR p.tenant_id<>NEW.tenant_id
  OR p.finding_id<>NEW.finding_id OR p.review_decision_id<>NEW.review_decision_id
  OR p.sequence<>NEW.sequence-1 OR p.kind=NEW.kind
  THEN RAISE EXCEPTION 'matching preceding event required' USING ERRCODE='42501'; END IF;
  IF NEW.kind='reverification' AND NEW.actor_id=p.actor_id THEN
   RAISE EXCEPTION 'independent reviewer identity required' USING ERRCODE='42501'; END IF;
 END IF;
 -- Typed, bounded observations; submitted remediation is never proof of success.
 IF (jsonb_typeof(NEW.evidence)='object'
 AND NEW.evidence->>'classification'='SYNTHETIC_STAGING_ONLY'
 AND NEW.evidence->'customer_data'='false'::jsonb
 AND jsonb_typeof(NEW.evidence->'observation')='string' AND length(trim(NEW.evidence->>'observation')) BETWEEN 15 AND 4000
 AND jsonb_typeof(NEW.evidence->'criterion')='string' AND length(trim(NEW.evidence->>'criterion')) BETWEEN 15 AND 2000
 AND jsonb_typeof(NEW.evidence->'limitations')='string' AND length(trim(NEW.evidence->>'limitations')) BETWEEN 15 AND 2000
 ) IS NOT TRUE THEN RAISE EXCEPTION 'complete synthetic observation required' USING ERRCODE='23514'; END IF;
 NEW.evidence_sha256:=encode(extensions.digest(convert_to(NEW.evidence::text,'UTF8'),'sha256'),'hex');
 NEW.created_at:=clock_timestamp();
 RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION proofline_private.guard_finding_followup_v1() FROM PUBLIC,anon,authenticated,service_role,proofline_stage_runtime,proofline_stage_login,supabase_auth_admin;
CREATE TRIGGER proofline_followup_guard BEFORE INSERT OR UPDATE OR DELETE ON proofline_private.finding_followups
 FOR EACH ROW EXECUTE FUNCTION proofline_private.guard_finding_followup_v1();
CREATE TRIGGER proofline_followup_no_truncate BEFORE TRUNCATE ON proofline_private.finding_followups
 FOR EACH STATEMENT EXECUTE FUNCTION proofline_private.reject_ledger_truncate_v1();
