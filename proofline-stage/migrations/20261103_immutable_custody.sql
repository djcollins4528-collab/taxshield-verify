-- Applied to Proofline's isolated Supabase staging database 2026-11-03.
-- Denies UPDATE, DELETE, and TRUNCATE against existing custody records.
CREATE OR REPLACE FUNCTION proofline_private.reject_custody_mutation_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'custody events are append-only; UPDATE, DELETE, and TRUNCATE prohibited'
    USING ERRCODE='23514';
END;
$$;
REVOKE ALL ON FUNCTION proofline_private.reject_custody_mutation_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION proofline_private.reject_custody_mutation_v1() TO proofline_stage_runtime;
DROP TRIGGER IF EXISTS proofline_custody_reject_mutation ON proofline_private.custody_events;
CREATE TRIGGER proofline_custody_reject_mutation
  BEFORE UPDATE OR DELETE ON proofline_private.custody_events
  FOR EACH ROW EXECUTE FUNCTION proofline_private.reject_custody_mutation_v1();
DROP TRIGGER IF EXISTS proofline_custody_reject_truncate ON proofline_private.custody_events;
CREATE TRIGGER proofline_custody_reject_truncate
  BEFORE TRUNCATE ON proofline_private.custody_events
  FOR EACH STATEMENT EXECUTE FUNCTION proofline_private.reject_custody_mutation_v1();
REVOKE UPDATE, DELETE, TRUNCATE ON proofline_private.custody_events
  FROM PUBLIC, anon, authenticated, proofline_stage_runtime, proofline_stage_login;
