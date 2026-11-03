\set ON_ERROR_STOP on
-- Execute after test_tenant_rls.sql: a disposable PG17 instance with two tenants.
-- Synth identities imitate UUIDs but are NOT Supabase Auth accounts.
ALTER TABLE proofline_private.memberships
 ADD COLUMN auth_user_id uuid,
 ADD COLUMN role text NOT NULL DEFAULT 'collector';
ALTER TABLE proofline_private.custody_events
 ADD COLUMN role text NOT NULL DEFAULT 'collector';
UPDATE proofline_private.memberships SET
 auth_user_id = CASE
 WHEN tenant_id='bbbbaaaa-1111-4111-8111-000000000001' THEN 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
 ELSE 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid END,
 role = CASE WHEN tenant_id='bbbbaaaa-1111-4111-8111-000000000001' THEN 'collector' ELSE 'reviewer' END,
 active=true;
-- Apply the exact SQL migration destined for live Supabase staging.
\ir ../migrations/20261103_runtime_active_membership_guard.sql
DO $test$
BEGIN
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='proofline_private'
 AND policyname LIKE 'proofline_runtime_%' AND permissive='RESTRICTIVE')<>8
 THEN RAISE EXCEPTION 'must have 8 restrictive tenant/identity policies'; END IF;
END; $test$;
-- Without user proof, even a correctly scoped tenant ID denies access.
BEGIN;
SET LOCAL ROLE proofline_stage_runtime;
SELECT set_config('proofline.tenant_id','bbbbaaaa-1111-4111-8111-000000000001',true);
DO $test$
DECLARE rejected boolean:=false;
BEGIN
 IF (SELECT count(*) FROM proofline_private.tenants)<>0 OR
    (SELECT count(*) FROM proofline_private.memberships)<>0 OR
    (SELECT count(*) FROM proofline_private.custody_events)<>0
 THEN RAISE EXCEPTION 'tenant context alone bypassed Auth'; END IF;
 BEGIN
  INSERT INTO proofline_private.custody_events VALUES
  ('bbbbaaaa-1111-4111-8111-000000000001',2,'55555555-5555-4555-8555-555555555555',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','collector');
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'missing auth identity allowed write'; END IF;
END; $test$;
ROLLBACK;
-- Authorized identity A / collector sees only A and can write only as self.
BEGIN;
SET LOCAL ROLE proofline_stage_runtime;
SELECT set_config('proofline.tenant_id','bbbbaaaa-1111-4111-8111-000000000001',true);
SELECT set_config('proofline.auth_user_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
DO $test$
DECLARE rejected boolean:=false;
BEGIN
 IF (SELECT count(*) FROM proofline_private.tenants)<>1 OR
    (SELECT count(*) FROM proofline_private.memberships)<>1 OR
    (SELECT count(*) FROM proofline_private.custody_events)<>1
 THEN RAISE EXCEPTION 'active collector cannot read own tenant'; END IF;
 BEGIN
  INSERT INTO proofline_private.custody_events VALUES
  ('bbbbaaaa-1111-4111-8111-000000000001',2,'66666666-6666-4666-8666-666666666666',
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','collector');
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'collector spoofed another actor'; END IF;
 rejected:=false;
 BEGIN
  INSERT INTO proofline_private.custody_events VALUES
  ('bbbbaaaa-1111-4111-8111-000000000001',2,'77777777-7777-4777-8777-777777777777',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','reviewer');
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'collector escalated to reviewer'; END IF;
 INSERT INTO proofline_private.custody_events VALUES
  ('bbbbaaaa-1111-4111-8111-000000000001',2,'88888888-8888-4888-8888-888888888888',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','collector');
 IF (SELECT count(*) FROM proofline_private.custody_events)<>2
 THEN RAISE EXCEPTION 'valid collector insert denied'; END IF;
END; $test$;
ROLLBACK;
-- A cannot cross to B even if it sets the requested tenant GUC to B.
BEGIN;
SET LOCAL ROLE proofline_stage_runtime;
SELECT set_config('proofline.tenant_id','ccccaaaa-2222-4222-8222-000000000002',true);
SELECT set_config('proofline.auth_user_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
DO $test$
DECLARE rejected boolean:=false;
BEGIN
 IF (SELECT count(*) FROM proofline_private.tenants)<>0 OR
    (SELECT count(*) FROM proofline_private.custody_events)<>0
 THEN RAISE EXCEPTION 'cross-tenant Auth data leak'; END IF;
 BEGIN
  INSERT INTO proofline_private.custody_events VALUES
   ('ccccaaaa-2222-4222-8222-000000000002',2,'99999999-9999-4999-8999-999999999999',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','collector');
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'cross-tenant Auth write allowed'; END IF;
END; $test$;
ROLLBACK;
-- Authorized B / reviewer can act as reviewer but not collector.
BEGIN;
SET LOCAL ROLE proofline_stage_runtime;
SELECT set_config('proofline.tenant_id','ccccaaaa-2222-4222-8222-000000000002',true);
SELECT set_config('proofline.auth_user_id','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
DO $test$
DECLARE rejected boolean:=false;
BEGIN
 IF (SELECT count(*) FROM proofline_private.tenants)<>1 OR
    (SELECT count(*) FROM proofline_private.custody_events)<>1
 THEN RAISE EXCEPTION 'authorized B cannot read own tenant'; END IF;
 BEGIN
  INSERT INTO proofline_private.custody_events VALUES
  ('ccccaaaa-2222-4222-8222-000000000002',2,'aaaaaaaa-aaaa-4aaa-8aaa-111111111111',
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','collector');
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'reviewer escalated to collector'; END IF;
 INSERT INTO proofline_private.custody_events VALUES
 ('ccccaaaa-2222-4222-8222-000000000002',2,'aaaaaaaa-aaaa-4aaa-8aaa-222222222222',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','reviewer');
END; $test$;
ROLLBACK;
-- Revoke A via admin before another independent A transaction.
UPDATE proofline_private.memberships SET active=false
 WHERE auth_user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
BEGIN;
SET LOCAL ROLE proofline_stage_runtime;
SELECT set_config('proofline.tenant_id','bbbbaaaa-1111-4111-8111-000000000001',true);
SELECT set_config('proofline.auth_user_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
DO $test$
DECLARE rejected boolean:=false;
BEGIN
 IF (SELECT count(*) FROM proofline_private.tenants)<>0 OR
    (SELECT count(*) FROM proofline_private.memberships)<>0 OR
    (SELECT count(*) FROM proofline_private.custody_events)<>0
 THEN RAISE EXCEPTION 'revoked membership still authorized'; END IF;
 BEGIN
  INSERT INTO proofline_private.custody_events VALUES
  ('bbbbaaaa-1111-4111-8111-000000000001',2,'aaaaaaaa-aaaa-4aaa-8aaa-333333333333',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','collector');
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'revoked collector could write'; END IF;
END; $test$;
ROLLBACK;
-- Make sure no tests wrote persistent custody events.
DO $test$
BEGIN
 IF (SELECT count(*) FROM proofline_private.custody_events)<>2
 THEN RAISE EXCEPTION 'test leaked custody writes'; END IF;
END; $test$;
SELECT 'PASS: active Auth identity/role/revocation enforcement at PostgreSQL runtime' AS result;
