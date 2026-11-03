-- Run on a staging database using a privileged test connection.
-- No Auth users are inserted or modified. All fixture operations roll back.
BEGIN;
CREATE TEMP TABLE proofline_sod_fixture (
  tenant_id uuid NOT NULL,
  auth_user_id uuid NOT NULL,
  role text NOT NULL,
  active boolean NOT NULL
) ON COMMIT DROP;
CREATE UNIQUE INDEX proofline_sod_fixture_guard
ON proofline_sod_fixture(tenant_id,auth_user_id)
WHERE active IS TRUE AND role IN ('collector','reviewer');
DO $$
DECLARE rejects integer := 0;
BEGIN
 INSERT INTO proofline_sod_fixture VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','collector',true);
 BEGIN
  INSERT INTO proofline_sod_fixture VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','reviewer',true);
  RAISE EXCEPTION 'dual-role grant unexpectedly accepted';
 EXCEPTION WHEN unique_violation THEN rejects:=rejects+1; END;
 INSERT INTO proofline_sod_fixture VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','reviewer',false);
 BEGIN
  UPDATE proofline_sod_fixture SET active=true WHERE role='reviewer';
  RAISE EXCEPTION 'conflicting reactivation unexpectedly accepted';
 EXCEPTION WHEN unique_violation THEN rejects:=rejects+1; END;
 INSERT INTO proofline_sod_fixture VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','auditor',true);
 INSERT INTO proofline_sod_fixture VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','reviewer',true);
 INSERT INTO proofline_sod_fixture VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','reviewer',true);
 IF rejects<>2 THEN RAISE EXCEPTION 'expected 2 denials; got %',rejects; END IF;
END $$;
SELECT count(*) AS accepted_fixture_rows FROM proofline_sod_fixture;
ROLLBACK;
