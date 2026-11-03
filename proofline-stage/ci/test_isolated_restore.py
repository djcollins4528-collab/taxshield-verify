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
        self.assertNotIn("INSERT INTO proofline_private.custody_events",sql)

    def test_modified_ciphertext_rejected_pre_db(self):
        doc=json.loads(runner.ARCHIVE.read_bytes())
        doc["events"][0]["sealed_b64"]="AA=="
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
