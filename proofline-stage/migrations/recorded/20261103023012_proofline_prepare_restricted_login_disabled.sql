DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='proofline_stage_login') THEN
    CREATE ROLE proofline_stage_login NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2;
  END IF;
END $$;
GRANT proofline_stage_runtime TO proofline_stage_login WITH INHERIT TRUE;
REVOKE ALL ON SCHEMA public FROM proofline_stage_login;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM proofline_stage_login;
