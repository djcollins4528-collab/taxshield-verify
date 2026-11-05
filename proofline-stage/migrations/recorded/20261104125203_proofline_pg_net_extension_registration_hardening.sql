
DO $migrate$
BEGIN
 IF (SELECT count(*) FROM net.http_request_queue) <> 0
 OR (SELECT count(*) FROM proofline_private.frontend_smoke_runs WHERE status IN ('pending','running')) <> 0
 OR (SELECT count(*) FROM proofline_private.http_rehearsal_dispatch WHERE state IN ('pending','running') AND created_at>clock_timestamp()-interval '10 minutes') <> 0
 OR (SELECT count(*) FROM proofline_private.synthetic_cleanup_tickets WHERE state IN ('pending','running') AND created_at>clock_timestamp()-interval '10 minutes') <> 0
 THEN RAISE EXCEPTION 'pg_net migration stopped: work in progress' USING ERRCODE='42501'; END IF;
 IF (SELECT extnamespace::regnamespace::text FROM pg_extension WHERE extname='pg_net') <> 'public'
 THEN RAISE EXCEPTION 'pg_net migration stopped: unexpected registration schema' USING ERRCODE='42501'; END IF;
END $migrate$;
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;
COMMENT ON EXTENSION pg_net IS 'Proofline staging asynchronous HTTP dispatch; registered in extensions to satisfy Supabase Security Advisor.';
