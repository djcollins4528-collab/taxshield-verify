"""Offline tests for fail-closed isolated synthetic PostgreSQL restore."""
import importlib.util, json, hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("proofline_restore_runner",ROOT/"run_isolated_restore.py")
runner=importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

class RestoreAcceptanceTests(unittest.TestCase):
    def test_pinned_synthetic_fixture(self):
        raw=runner.ARCHIVE.read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(),runner.PIN)
        doc=json.loads(raw)
        self.assertEqual(doc["version"],"proofline.postgres-custody-archive.v1")
        self.assertEqual([x["kind"] for x in doc["events"]],["evidence","review"])
        self.assertEqual(doc["events"][1]["reviewed_evidence_id"],doc["events"][0]["id"])
        self.assertNotEqual(doc["events"][1]["actor"],doc["events"][0]["actor"])
        self.assertEqual(doc["events"][1]["prev"],doc["events"][0]["digest"])

    def test_restore_sql_uses_safe_isolated_destination(self):
        sql=runner.sql_script()
        self.assertIn("CREATE TABLE recovery_acceptance.custody_events",sql)
        self.assertIn("reviewed_evidence_id",sql)
        self.assertIn("ROLLBACK",sql)
        self.assertIn("unique_violation",sql)
        self.assertIn("recovered binary/text fields differ from pinned archive",sql)
        self.assertIn("SELECT * FROM expected EXCEPT SELECT * FROM recovery_acceptance.custody_events",sql)
        self.assertNotIn("INSERT INTO proofline_private.custody_events",sql)

    def test_independent_signed_anchor_verified(self):
        raw=runner.ARCHIVE.read_bytes()
        runner.verify_signed_synthetic_anchor(raw)

    def test_tampered_signature_rejected(self):
        anchor_path=runner.ARCHIVE.with_name("signed-synthetic-anchor.json")
        anchor=json.loads(anchor_path.read_bytes())
        anchor["signature_ed25519_b64"]="AA" + anchor["signature_ed25519_b64"][2:]
        with TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/"synthetic-verified-archive.json").write_bytes(runner.ARCHIVE.read_bytes())
            (root/"signed-synthetic-anchor.json").write_text(json.dumps(anchor))
            (root/"public-pinned-signer.json").write_bytes(
                runner.ARCHIVE.with_name("public-pinned-signer.json").read_bytes())
            with patch.object(runner,"ARCHIVE",root/"synthetic-verified-archive.json"):
                with self.assertRaises(RuntimeError):
                    runner.verify_signed_synthetic_anchor(runner.ARCHIVE.read_bytes())

    def test_wrong_signer_rejected(self):
        pinned_path=runner.ARCHIVE.with_name("public-pinned-signer.json")
        pinned=json.loads(pinned_path.read_bytes())
        pinned["signer_public_key_hex"]="00"*32
        with TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/"synthetic-verified-archive.json").write_bytes(runner.ARCHIVE.read_bytes())
            (root/"signed-synthetic-anchor.json").write_bytes(
                runner.ARCHIVE.with_name("signed-synthetic-anchor.json").read_bytes())
            (root/"public-pinned-signer.json").write_text(json.dumps(pinned))
            with patch.object(runner,"ARCHIVE",root/"synthetic-verified-archive.json"):
                with self.assertRaises(RuntimeError):
                    runner.verify_signed_synthetic_anchor(runner.ARCHIVE.read_bytes())

    def test_plpgsql_blocks_have_required_semicolons(self):
        sql=runner.sql_script()
        self.assertNotIn("END $;",sql)
        self.assertGreaterEqual(sql.count("END; $;"),2)

    def test_modified_ciphertext_rejected_pre_db(self):
        doc=json.loads(runner.ARCHIVE.read_bytes())
        doc["events"][0]["sealed_b64"]="AA=="
        with TemporaryDirectory() as tmp:
            source=Path(tmp)/"archive.json"
            source.write_text(json.dumps(doc))
            with patch.object(runner,"ARCHIVE",source):
                with self.assertRaises(RuntimeError):runner.sql_script()

    def test_broken_reviewer_link_rejected_pre_db(self):
        doc=json.loads(runner.ARCHIVE.read_bytes())
        doc["events"][1]["prev"]="GENESIS"
        with TemporaryDirectory() as tmp:
            source=Path(tmp)/"archive.json"
            source.write_text(json.dumps(doc))
            with patch.object(runner,"ARCHIVE",source):
                with self.assertRaises(RuntimeError):runner.sql_script()

    def test_modified_tenant_rejected_pre_db(self):
        doc=json.loads(runner.ARCHIVE.read_bytes())
        doc["tenants"]=["11111111-1111-4111-8111-111111111111"]
        with TemporaryDirectory() as tmp:
            source=Path(tmp)/"archive.json"
            source.write_text(json.dumps(doc))
            with patch.object(runner,"ARCHIVE",source):
                with self.assertRaises(RuntimeError):runner.sql_script()

if __name__=="__main__":unittest.main()
