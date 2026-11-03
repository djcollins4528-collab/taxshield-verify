\set ON_ERROR_STOP on
-- Operator-only acceptance: real staging, pinned SYNTHETIC data.
-- Any unexpected acceptance raises an exception. All attempted writes roll back.
BEGIN;
DO $accept$
DECLARE
 t uuid:='bbbbaaaa-1111-4111-8111-000000000001';
 evidence_id uuid;
 owner_actor text;
 tip text;
 rejected boolean;
BEGIN
 SELECT id,actor INTO STRICT evidence_id,owner_actor FROM proofline_private.custody_events
 WHERE tenant_id=t AND seq=1 AND kind='evidence';
 SELECT digest INTO STRICT tip FROM proofline_private.custody_events
 WHERE tenant_id=t AND seq=2 AND kind='review';
 IF (SELECT count(*) FROM proofline_private.custody_events WHERE tenant_id=t)<>2
 THEN RAISE EXCEPTION 'unexpected synthetic history'; END IF;
 -- Self-review must be rejected by existing independent-actor trigger.
 rejected:=false;
 BEGIN
  INSERT INTO proofline_private.custody_events
   (tenant_id,seq,id,kind,actor,role,at,nonce,sealed,prev,digest,reviewed_evidence_id)
  VALUES(t,3,gen_random_uuid(),'review',owner_actor,'reviewer',now(),
   decode('0102030405060708090a0b0c','hex'),decode(repeat('ab',20),'hex'),tip,
   repeat('1',64),evidence_id);
 EXCEPTION WHEN check_violation THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'self-review accepted'; END IF;
 -- A second reviewer must be rejected by existing partial unique index.
 rejected:=false;
 BEGIN
  INSERT INTO proofline_private.custody_events
   (tenant_id,seq,id,kind,actor,role,at,nonce,sealed,prev,digest,reviewed_evidence_id)
  VALUES(t,3,gen_random_uuid(),'review','synthetic-reviewer-two','reviewer',now(),
   decode('0102030405060708090a0b0c','hex'),decode(repeat('ab',20),'hex'),tip,
   repeat('2',64),evidence_id);
 EXCEPTION WHEN unique_violation THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'duplicate review accepted'; END IF;
 -- Role mismatch must be rejected.
 rejected:=false;
 BEGIN
  INSERT INTO proofline_private.custody_events
   (tenant_id,seq,id,kind,actor,role,at,nonce,sealed,prev,digest,reviewed_evidence_id)
  VALUES(t,3,gen_random_uuid(),'review','synthetic-reviewer-two','collector',now(),
   decode('0102030405060708090a0b0c','hex'),decode(repeat('ab',20),'hex'),tip,
   repeat('3',64),evidence_id);
 EXCEPTION WHEN check_violation THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'invalid review role accepted'; END IF;
 rejected:=false;
 BEGIN
  UPDATE proofline_private.custody_events SET actor='tampered' WHERE tenant_id=t AND seq=1;
 EXCEPTION WHEN check_violation THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'custody UPDATE accepted'; END IF;
 rejected:=false;
 BEGIN
  DELETE FROM proofline_private.custody_events WHERE tenant_id=t AND seq=1;
 EXCEPTION WHEN check_violation THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'custody DELETE accepted'; END IF;
 IF (SELECT count(*) FROM proofline_private.custody_events WHERE tenant_id=t)<>2
 THEN RAISE EXCEPTION 'unexpected posttest synthetic history'; END IF;
 RAISE NOTICE 'PASS: all five custody violations blocked';
END; $accept$;
ROLLBACK;
