\set ON_ERROR_STOP on
-- CI ONLY: test the committed restrictive Supabase migration under an
-- actual NOLOGIN, NOBYPASSRLS PostgreSQL runtime role.
CREATE ROLE proofline_stage_runtime NOLOGIN NOBYPASSRLS;
CREATE SCHEMA proofline_private;
CREATE TABLE proofline_private.tenants (id uuid PRIMARY KEY,slug text NOT NULL);
CREATE TABLE proofline_private.memberships (id uuid PRIMARY KEY,tenant_id uuid NOT NULL,active boolean NOT NULL);
CREATE TABLE proofline_private.custody_events
 (tenant_id uuid NOT NULL,seq bigint NOT NULL,id uuid NOT NULL,actor text NOT NULL,PRIMARY KEY(tenant_id,seq));
INSERT INTO proofline_private.tenants VALUES
 ('bbbbaaaa-1111-4111-8111-000000000001','synthetic-a'),
 ('ccccaaaa-2222-4222-8222-000000000002','synthetic-b');
INSERT INTO proofline_private.memberships VALUES
 ('11111111-1111-4111-8111-111111111111','bbbbaaaa-1111-4111-8111-000000000001',true),
 ('22222222-2222-4222-8222-222222222222','ccccaaaa-2222-4222-8222-000000000002',false);
INSERT INTO proofline_private.custody_events VALUES
 ('bbbbaaaa-1111-4111-8111-000000000001',1,'33333333-3333-4333-8333-333333333333','synthetic-a'),
 ('ccccaaaa-2222-4222-8222-000000000002',1,'44444444-4444-4444-8444-444444444444','synthetic-b');
GRANT USAGE ON SCHEMA proofline_private TO proofline_stage_runtime;
GRANT SELECT ON proofline_private.tenants,proofline_private.memberships TO proofline_stage_runtime;
GRANT SELECT,INSERT ON proofline_private.custody_events TO proofline_stage_runtime;
ALTER TABLE proofline_private.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE proofline_private.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE proofline_private.custody_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY initial_tenants ON proofline_private.tenants FOR SELECT TO proofline_stage_runtime USING(true);
CREATE POLICY initial_members ON proofline_private.memberships FOR SELECT TO proofline_stage_runtime USING(true);
CREATE POLICY initial_events_read ON proofline_private.custody_events FOR SELECT TO proofline_stage_runtime USING(true);
CREATE POLICY initial_events_write ON proofline_private.custody_events FOR INSERT TO proofline_stage_runtime WITH CHECK(true);
-- Apply actual, deployed production-shaped migration:
\ir ../migrations/20261103_restrictive_tenant_rls.sql
DO $test$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='proofline_stage_runtime' AND (rolcanlogin OR rolbypassrls))
 THEN RAISE EXCEPTION 'runtime role has forbidden privilege'; END IF;
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='proofline_private'
 AND policyname LIKE 'proofline_runtime_%' AND permissive='RESTRICTIVE')<>4
 THEN RAISE EXCEPTION 'four restrictive policies required'; END IF;
END; $test$;
-- Missing context: neither read nor write even though original policies allow all.
BEGIN;
SET LOCAL ROLE proofline_stage_runtime;
DO $test$
DECLARE rejected boolean:=false;
BEGIN
 IF (SELECT count(*) FROM proofline_private.tenants)<>0 OR
    (SELECT count(*) FROM proofline_private.memberships)<>0 OR
    (SELECT count(*) FROM proofline_private.custody_events)<>0
 THEN RAISE EXCEPTION 'missing context leaked data'; END IF;
 BEGIN
  INSERT INTO proofline_private.custody_events VALUES
   ('bbbbaaaa-1111-4111-8111-000000000001',2,'55555555-5555-4555-8555-555555555555','no-context');
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'missing context allowed write'; END IF;
END; $test$;
ROLLBACK;
-- Tenant A: see its rows, reject B write, allow A write within rollback.
BEGIN;
SET LOCAL ROLE proofline_stage_runtime;
SELECT set_config('proofline.tenant_id','bbbbaaaa-1111-4111-8111-000000000001',true);
DO $test$
DECLARE rejected boolean:=false;
BEGIN
 IF (SELECT count(*) FROM proofline_private.tenants)<>1 OR
    (SELECT count(*) FROM proofline_private.memberships)<>1 OR
    (SELECT count(*) FROM proofline_private.custody_events)<>1
 THEN RAISE EXCEPTION 'tenant A could read wrong number of rows'; END IF;
 IF EXISTS(SELECT 1 FROM proofline_private.tenants WHERE id='ccccaaaa-2222-4222-8222-000000000002')
 THEN RAISE EXCEPTION 'tenant B leaked to A'; END IF;
 BEGIN
  INSERT INTO proofline_private.custody_events VALUES
   ('ccccaaaa-2222-4222-8222-000000000002',2,'66666666-6666-4666-8666-666666666666','cross-tenant');
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'cross-tenant write allowed'; END IF;
 INSERT INTO proofline_private.custody_events VALUES
  ('bbbbaaaa-1111-4111-8111-000000000001',2,'77777777-7777-4777-8777-777777777777','same-tenant');
 IF (SELECT count(*) FROM proofline_private.custody_events)<>2
 THEN RAISE EXCEPTION 'same-tenant write failed'; END IF;
END; $test$;
ROLLBACK;
-- Separate pooled transaction: correct isolation for tenant B.
BEGIN;
SET LOCAL ROLE proofline_stage_runtime;
SELECT set_config('proofline.tenant_id','ccccaaaa-2222-4222-8222-000000000002',true);
DO $test$
BEGIN
 IF (SELECT count(*) FROM proofline_private.tenants)<>1 OR
    (SELECT count(*) FROM proofline_private.memberships)<>1 OR
    (SELECT count(*) FROM proofline_private.custody_events)<>1
 THEN RAISE EXCEPTION 'tenant B scope failed'; END IF;
 IF EXISTS(SELECT 1 FROM proofline_private.tenants WHERE id='bbbbaaaa-1111-4111-8111-000000000001')
 THEN RAISE EXCEPTION 'tenant A leaked to B'; END IF;
END; $test$;
ROLLBACK;
-- Malformed context is NOT interpreted as SQL or matching UUID.
BEGIN;
SET LOCAL ROLE proofline_stage_runtime;
SELECT set_config('proofline.tenant_id','bbbbaaaa-1111-4111-8111-000000000001 OR TRUE',true);
DO $test$
BEGIN
 IF (SELECT count(*) FROM proofline_private.tenants)<>0 OR
    (SELECT count(*) FROM proofline_private.custody_events)<>0
 THEN RAISE EXCEPTION 'malformed context leaked'; END IF;
END; $test$;
ROLLBACK;
DO $test$
BEGIN
 IF (SELECT count(*) FROM proofline_private.custody_events)<>2
 THEN RAISE EXCEPTION 'test changed fixture'; END IF;
 IF current_user<>session_user THEN RAISE EXCEPTION 'role leaked across transactions'; END IF;
END; $test$;
SELECT 'PASS: tenant-isolation policy as genuine restricted PG role' AS result;
