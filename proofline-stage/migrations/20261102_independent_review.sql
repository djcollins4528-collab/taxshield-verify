-- Applied to proofline-assurance-staging (pgknyzwctmfqvlivlgpe).
-- Require an explicit evidence reference for every review event.
ALTER TABLE proofline_private.custody_events
ADD COLUMN IF NOT EXISTS reviewed_evidence_id uuid;
ALTER TABLE proofline_private.custody_events
ADD CONSTRAINT proofline_review_reference_required
CHECK ((kind='evidence' AND reviewed_evidence_id IS NULL)
 OR (kind='review' AND reviewed_evidence_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS proofline_review_target_index
ON proofline_private.custody_events(tenant_id,reviewed_evidence_id)
WHERE kind='review';

CREATE OR REPLACE FUNCTION proofline_private.enforce_custody_chain_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE prior_seq bigint; prior_digest text; original_actor text; original_kind text;
BEGIN
 IF NEW.actor IS NULL OR length(btrim(NEW.actor))=0 OR length(NEW.actor)>256
 THEN RAISE EXCEPTION 'invalid custody actor' USING ERRCODE='23514'; END IF;
 IF NOT ((NEW.kind='evidence' AND NEW.role='collector')
      OR (NEW.kind='review' AND NEW.role='reviewer'))
 THEN RAISE EXCEPTION 'event kind/role mismatch' USING ERRCODE='23514'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.tenant_id::text,0));
 IF NEW.kind='review' THEN
  SELECT actor,kind INTO original_actor,original_kind
  FROM proofline_private.custody_events
  WHERE tenant_id=NEW.tenant_id AND id=NEW.reviewed_evidence_id;
  IF NOT FOUND OR original_kind<>'evidence'
  THEN RAISE EXCEPTION 'review target not found in same tenant' USING ERRCODE='23514'; END IF;
  IF original_actor=NEW.actor
  THEN RAISE EXCEPTION 'self review prohibited' USING ERRCODE='23514'; END IF;
 END IF;
 SELECT seq,digest INTO prior_seq,prior_digest FROM proofline_private.custody_events
 WHERE tenant_id=NEW.tenant_id ORDER BY seq DESC LIMIT 1;
 IF NOT FOUND THEN
  IF NEW.seq<>1 OR NEW.prev<>'GENESIS'
  THEN RAISE EXCEPTION 'invalid initial chain' USING ERRCODE='23514'; END IF;
 ELSE
  IF prior_seq=9223372036854775807 OR NEW.seq<>prior_seq+1 OR NEW.prev<>prior_digest
  THEN RAISE EXCEPTION 'invalid append chain' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION proofline_private.enforce_custody_chain_v1()
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION proofline_private.enforce_custody_chain_v1()
TO proofline_stage_runtime;