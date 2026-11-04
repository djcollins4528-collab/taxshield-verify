CREATE OR REPLACE FUNCTION proofline_private.enforce_custody_chain_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  prior_seq bigint;
  prior_digest text;
BEGIN
  IF NEW.actor IS NULL OR length(btrim(NEW.actor))=0 OR length(NEW.actor)>256 THEN
    RAISE EXCEPTION 'invalid custody actor' USING ERRCODE='23514';
  END IF;
  IF NOT ((NEW.kind='evidence' AND NEW.role='collector') OR (NEW.kind='review' AND NEW.role='reviewer')) THEN
    RAISE EXCEPTION 'custody event kind and role mismatch' USING ERRCODE='23514';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.tenant_id::text, 0));
  SELECT seq, digest INTO prior_seq, prior_digest
  FROM proofline_private.custody_events
  WHERE tenant_id=NEW.tenant_id
  ORDER BY seq DESC LIMIT 1;
  IF NOT FOUND THEN
    IF NEW.seq<>1 OR NEW.prev<>'GENESIS' THEN
      RAISE EXCEPTION 'invalid initial custody sequence/link' USING ERRCODE='23514';
    END IF;
  ELSE
    IF prior_seq = 9223372036854775807 OR NEW.seq<>prior_seq+1 OR NEW.prev<>prior_digest THEN
      RAISE EXCEPTION 'invalid custody sequence/link' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION proofline_private.enforce_custody_chain_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION proofline_private.enforce_custody_chain_v1() TO proofline_stage_runtime;
DROP TRIGGER IF EXISTS proofline_custody_append_guard ON proofline_private.custody_events;
CREATE TRIGGER proofline_custody_append_guard
BEFORE INSERT ON proofline_private.custody_events
FOR EACH ROW EXECUTE FUNCTION proofline_private.enforce_custody_chain_v1();
