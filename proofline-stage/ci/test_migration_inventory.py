import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from replay_recorded_migrations import verified_migrations

class MigrationInventoryTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
  self.path=Path(self.temp.name);self.sql=self.path/'20261104000000_test.sql'
  self.sql.write_text('SELECT 1;\n',encoding='utf-8')
  (self.path/'manifest.json').write_text(json.dumps({'migrations':[{'file':self.sql.name,'sha256_lf':hashlib.sha256(b'SELECT 1;\n').hexdigest()}]}))
 def test_verified_inventory(self): self.assertEqual(verified_migrations(self.path),[self.sql])
 def test_tampered_sql_fails(self):
  self.sql.write_text('SELECT 2;\n')
  with self.assertRaises(ValueError): verified_migrations(self.path)
 def test_missing_migration_fails(self):
  self.sql.unlink()
  with self.assertRaises(ValueError): verified_migrations(self.path)
 def test_unrecorded_migration_fails(self):
  (self.path/'20261104000001_extra.sql').write_text('SELECT 1;')
  with self.assertRaises(ValueError): verified_migrations(self.path)
