#!/usr/bin/env python3
"""Restore pinned synthetic ciphertext into an isolated PostgreSQL instance.
Requires a fresh empty PGDATABASE; no real data, database secrets, or signing keys."""
import base64, hashlib, json, os, pathlib, subprocess, sys
ARCHIVE=pathlib.Path(__file__).with_name("synthetic-verified-archive.json")
PIN="f9a23bbea2e9a1dd2f9a898d27ba064b1a04718630673392f06baee7fd92f8fc"
def verify_signed_synthetic_anchor(snapshot):
    """Verify independent Ed25519 signature and frozen prior inventory before SQL."""
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
    anchor_file=ARCHIVE.with_name("signed-synthetic-anchor.json")
    key_file=ARCHIVE.with_name("public-pinned-signer.json")
    try:
        anchor=json.loads(anchor_file.read_bytes())
        pinned=json.loads(key_file.read_bytes())
        statement=anchor["statement"]
        canonical=lambda obj: json.dumps(obj,sort_keys=True,separators=(",",":")).encode("utf-8")
        if sorted(anchor)!=["signature_ed25519_b64","statement"]:
            raise ValueError("Unexpected anchor fields")
        if (pinned["archive_sha256"]!=PIN or
            statement["version"]!="proofline.postgres-archive-anchor.v1" or
            statement["snapshot_sha256"]!=hashlib.sha256(snapshot).hexdigest() or
            statement["inventory"]!=[{
                "count":2,
                "tenant":"bbbbaaaa-1111-4111-8111-000000000001",
                "tip":"d23c678eb918133589feeb1e1e0dd4e68630a8ae746920ce68379f705118a94c"
            }]):
            raise ValueError("Signed inventory or pinned archive mismatch")
        public=bytes.fromhex(pinned["signer_public_key_hex"])
        signature=base64.b64decode(anchor["signature_ed25519_b64"],validate=True)
        Ed25519PublicKey.from_public_bytes(public).verify(signature,canonical(statement))
    except Exception as exc:
        raise RuntimeError("Signed recovery archive verification failed") from exc

def sql_script():
    raw=ARCHIVE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=PIN:
        raise RuntimeError("Pinned archive digest mismatch")
    doc=json.loads(raw)
    if doc.get("version")!="proofline.postgres-custody-archive.v1" or len(doc["tenants"])!=1 or len(doc["events"])!=2:
        raise RuntimeError("Unexpected fixture")
    if [e["kind"] for e in doc["events"]] != ["evidence","review"]:
        raise RuntimeError("Unexpected event order")
    if doc["tenants"] != ["bbbbaaaa-1111-4111-8111-000000000001"]:
        raise RuntimeError("Unexpected tenant inventory")
    first, second = doc["events"]
    if not (first["seq"] == 1 and second["seq"] == 2 and
            first["prev"] == "GENESIS" and second["prev"] == first["digest"] and
            second["reviewed_evidence_id"] == first["id"] and
            first["actor"] != second["actor"] and
            first["tenant"] == second["tenant"] == doc["tenants"][0]):
        raise RuntimeError("Broken evidence/review fixture")
    verify_signed_synthetic_anchor(raw)
    payload=base64.b64encode(raw).decode()
    return r"""\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA recovery_acceptance;
CREATE TABLE recovery_acceptance.custody_events(
tenant_id uuid NOT NULL, seq bigint NOT NULL, id uuid NOT NULL UNIQUE,
kind text NOT NULL CHECK (kind IN ('evidence','review')), actor text NOT NULL,
role text NOT NULL, at timestamptz NOT NULL, nonce bytea NOT NULL,
sealed bytea NOT NULL, prev text NOT NULL, digest text NOT NULL,
reviewed_evidence_id uuid, PRIMARY KEY(tenant_id,seq),
CHECK ((kind='evidence' AND role='collector' AND reviewed_evidence_id IS NULL)
OR (kind='review' AND role='reviewer' AND reviewed_evidence_id IS NOT NULL))
);
CREATE UNIQUE INDEX one_review ON recovery_acceptance.custody_events(tenant_id,reviewed_evidence_id) WHERE kind='review';
WITH doc AS (SELECT convert_from(decode('PAYLOAD','base64'),'UTF8')::jsonb j)
INSERT INTO recovery_acceptance.custody_events
(tenant_id,seq,id,kind,actor,role,at,nonce,sealed,prev,digest,reviewed_evidence_id)
SELECT (e->>'tenant')::uuid,(e->>'seq')::bigint,(e->>'id')::uuid,
e->>'kind',e->>'actor',e->>'role',(e->>'at')::timestamptz,
decode(regexp_replace(e->>'nonce_b64','\\s','','g'),'base64'),
decode(regexp_replace(e->>'sealed_b64','\\s','','g'),'base64'),
e->>'prev',e->>'digest',(e->>'reviewed_evidence_id')::uuid
FROM doc,LATERAL jsonb_array_elements(doc.j->'events') e;
DO $$
BEGIN
 IF (SELECT count(*) FROM recovery_acceptance.custody_events)<>2 THEN RAISE EXCEPTION 'bad restore count'; END IF;
 IF EXISTS(SELECT 1 FROM recovery_acceptance.custody_events r
 WHERE (r.seq=1 AND (r.kind<>'evidence' OR r.prev<>'GENESIS'))
 OR (r.seq=2 AND (r.kind<>'review' OR NOT EXISTS(
 SELECT 1 FROM recovery_acceptance.custody_events e
 WHERE e.tenant_id=r.tenant_id AND e.seq=1 AND e.id=r.reviewed_evidence_id
 AND e.kind='evidence' AND e.actor<>r.actor AND e.digest=r.prev)))) THEN
 RAISE EXCEPTION 'custody chain or reviewer invariant failed'; END IF;
 -- Check the native PostgreSQL binary columns against the exact pinned archive.
 IF EXISTS (
   WITH doc2 AS (SELECT convert_from(decode('PAYLOAD','base64'),'UTF8')::jsonb j),
   expected AS (
     SELECT (e->>'tenant')::uuid tenant_id,(e->>'seq')::bigint seq,
       (e->>'id')::uuid id,e->>'kind' kind,e->>'actor' actor,e->>'role' role,
       (e->>'at')::timestamptz at,decode(e->>'nonce_b64','base64') nonce,
       decode(e->>'sealed_b64','base64') sealed,
       e->>'prev' prev,e->>'digest' digest,
       (e->>'reviewed_evidence_id')::uuid reviewed_evidence_id
     FROM doc2,LATERAL jsonb_array_elements(doc2.j->'events') e
   )
   (SELECT * FROM expected EXCEPT SELECT * FROM recovery_acceptance.custody_events)
   UNION ALL
   (SELECT * FROM recovery_acceptance.custody_events EXCEPT SELECT * FROM expected)
 ) THEN RAISE EXCEPTION 'recovered binary/text fields differ from pinned archive'; END IF;
END $;
COMMIT;
BEGIN;
CREATE TEMP TABLE mutated AS TABLE recovery_acceptance.custody_events;
UPDATE mutated SET actor='deliberate-tamper' WHERE seq=1;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM mutated m JOIN recovery_acceptance.custody_events o
 USING(tenant_id,seq) WHERE m.actor IS DISTINCT FROM o.actor)
 THEN RAISE EXCEPTION 'tamper check failed'; END IF;
END $$;
ROLLBACK;
DO $$ DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  INSERT INTO recovery_acceptance.custody_events
  SELECT * FROM recovery_acceptance.custody_events WHERE seq=1;
 EXCEPTION WHEN unique_violation THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'overwrite unexpectedly allowed'; END IF;
END $$;
SELECT count(*) AS restored_rows,
count(*) FILTER (WHERE kind='review') AS independent_reviews
FROM recovery_acceptance.custody_events;
""".replace("PAYLOAD",payload)
def main():
    generated=sql_script()
    if "--dry-run" in sys.argv:
        print("PASS: pinned encrypted synthetic archive validated; SQL bytes",len(generated)); return
    if not all(os.getenv(x) for x in ("PGHOST","PGPORT","PGUSER","PGPASSWORD","PGDATABASE")):
        raise SystemExit("FAIL CLOSED: dedicated PostgreSQL test connection required")
    r=subprocess.run(["psql","-X","-v","ON_ERROR_STOP=1","-q"],input=generated,
                     text=True,capture_output=True,timeout=90)
    if r.returncode!=0:
        raise SystemExit("PostgreSQL restore failed: "+r.stderr[-1200:])
    verify=subprocess.run(
        ["psql","-X","-A","-t","-q","-v","ON_ERROR_STOP=1","-c",
         "SELECT count(*)::text || '|' || (count(*) FILTER (WHERE kind='review'))::text FROM recovery_acceptance.custody_events"],
        text=True,capture_output=True,timeout=15)
    if verify.returncode!=0 or verify.stdout.strip()!="2|1":
        raise SystemExit("FAIL CLOSED: independent PostgreSQL readback must return 2 events and 1 review")
    print("PASS: independent PostgreSQL restore, review linkage, tamper and overwrite controls")
    print(r.stdout.strip())
if __name__=="__main__":main()
