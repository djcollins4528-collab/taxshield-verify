\set ON_ERROR_STOP on
-- Operator-only one-time enrollment of genuine Supabase Auth identities.
-- Required command:
-- psql "$CONTROLLED_ADMIN_DATABASE_URL" -X -v ON_ERROR_STOP=1 \
--   -v collector_email='proofline-collector-test@your-controlled-domain' \
--   -v reviewer_email='proofline-reviewer-test@your-controlled-domain' \
--   -f proofline-stage/ci/enroll_existing_auth_test_users.sql
-- This file DOES NOT create or modify auth.users and grants no public privileges.
-- Do not supply customer addresses; use dedicated synthetic-only mailboxes.
\if :{?collector_email}
\else
\echo 'FAIL CLOSED: collector_email psql variable required'
\quit 10
\endif
\if :{?reviewer_email}
\else
\echo 'FAIL CLOSED: reviewer_email psql variable required'
\quit 11
\endif
BEGIN;
CREATE TEMP TABLE proofline_enrollment_input(
  role text PRIMARY KEY, email text NOT NULL
) ON COMMIT DROP;
INSERT INTO proofline_enrollment_input(role,email) VALUES
 ('collector', lower(trim(:'collector_email'))),
 ('reviewer', lower(trim(:'reviewer_email')));
DO $guard$
DECLARE
  members_found integer;
  tenant_found integer;
  prior_memberships integer;
  confirmed_found integer;
  role_distinct integer;
BEGIN
  SELECT count(DISTINCT email) INTO role_distinct FROM proofline_enrollment_input;
  IF role_distinct<>2 THEN
    RAISE EXCEPTION 'refusing identical collector/reviewer mailboxes';
  END IF;
  IF EXISTS(
    SELECT 1 FROM proofline_enrollment_input
    WHERE NOT (
      (role='collector' AND email ~ '^proofline-collector-test(\+[a-z0-9_-]+)?@[a-z0-9.-]+\.[a-z]{2,}$')
      OR (role='reviewer' AND email ~ '^proofline-reviewer-test(\+[a-z0-9_-]+)?@[a-z0-9.-]+\.[a-z]{2,}$')
    )
  ) THEN
    RAISE EXCEPTION 'only dedicated synthetic Proofline test mailboxes allowed';
  END IF;
  SELECT count(*) INTO tenant_found
  FROM proofline_private.tenants
  WHERE id='bbbbaaaa-1111-4111-8111-000000000001'::uuid;
  IF tenant_found<>1 THEN RAISE EXCEPTION 'pinned staging tenant missing'; END IF;
  SELECT count(*) INTO prior_memberships
  FROM proofline_private.memberships
  WHERE tenant_id='bbbbaaaa-1111-4111-8111-000000000001'::uuid;
  IF prior_memberships<>0 THEN
    RAISE EXCEPTION 'one-time enrollment refuses an already populated tenant';
  END IF;
  SELECT count(*),count(DISTINCT u.id)
    INTO members_found,confirmed_found
  FROM proofline_enrollment_input i
  JOIN auth.users u ON lower(u.email)=i.email
  WHERE u.email_confirmed_at IS NOT NULL
    AND coalesce(u.is_anonymous,false)=false
    AND u.deleted_at IS NULL
    AND (u.banned_until IS NULL OR u.banned_until < now());
  IF members_found<>2 OR confirmed_found<>2 THEN
    RAISE EXCEPTION 'requires two distinct existing confirmed unbanned Supabase Auth users';
  END IF;
END; $guard$;
INSERT INTO proofline_private.memberships
 (id,tenant_id,issuer,subject,role,active,auth_user_id)
SELECT gen_random_uuid(),
 'bbbbaaaa-1111-4111-8111-000000000001'::uuid,
 'https://pgknyzwctmfqvlivlgpe.supabase.co/auth/v1',
 u.id::text,i.role,true,u.id
FROM proofline_enrollment_input i
JOIN auth.users u ON lower(u.email)=i.email
WHERE u.email_confirmed_at IS NOT NULL
  AND coalesce(u.is_anonymous,false)=false
  AND u.deleted_at IS NULL
  AND (u.banned_until IS NULL OR u.banned_until < now());
DO $guard$
DECLARE n integer; distinct_users integer;
BEGIN
 SELECT count(*),count(DISTINCT auth_user_id) INTO n,distinct_users
 FROM proofline_private.memberships
 WHERE tenant_id='bbbbaaaa-1111-4111-8111-000000000001'::uuid
   AND role IN ('collector','reviewer')
   AND active;
 IF n<>2 OR distinct_users<>2 THEN
   RAISE EXCEPTION 'enrollment postcondition failed: roles/subjects must be distinct';
 END IF;
END; $guard$;
COMMIT;
SELECT 'PASS: two existing, confirmed synthetic Auth accounts linked to separate roles' AS result;
