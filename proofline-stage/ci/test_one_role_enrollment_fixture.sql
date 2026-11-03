\set ON_ERROR_STOP on
-- Run only in disposable PG17 CI after existing custody and RLS acceptance.
\ir ../migrations/20261103_single_role_per_auth_user.sql
DO $test$
DECLARE rejected boolean:=false;
BEGIN
 BEGIN
  INSERT INTO proofline_private.memberships
  (id,tenant_id,active,auth_user_id,role)
  VALUES ('99999999-9999-4999-8999-999999999999',
  'bbbbaaaa-1111-4111-8111-000000000001',true,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','reviewer');
 EXCEPTION WHEN unique_violation THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'collector may hold reviewer role in same tenant'; END IF;
END; $test$;
-- Isolated mock of externally provisioned, verified Supabase Auth users.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE auth.users(
 id uuid PRIMARY KEY,email text UNIQUE NOT NULL,email_confirmed_at timestamptz,
 is_anonymous boolean NOT NULL DEFAULT false,deleted_at timestamptz,
 banned_until timestamptz
);
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','proofline-collector-test@example.invalid',now()),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','proofline-reviewer-test@example.invalid',now());
ALTER TABLE proofline_private.memberships
 ADD COLUMN issuer text,ADD COLUMN subject text;
DELETE FROM proofline_private.memberships;
SELECT 'PASS: synthetic identity fixture prepared' AS result;
