"""Safety regression tests for Proofline's synthetic-only database probe."""
import os,unittest
from unittest.mock import patch
from db_probe import require_secure_dsn
HOST="aws-example-region.pooler.supabase.com" # DOCUMENTATION EXAMPLE ONLY; not a discovered Supabase endpoint
DSN="postgresql://proofline_stage_login.pgknyzwctmfqvlivlgpe:test-placeholder@"+HOST+":5432/postgres?sslmode=verify-full&sslrootcert=system"
class PoolerGate(unittest.TestCase):
 def test_missing_exact_pooler_host_denied(self):
  with patch.dict(os.environ,{"PROOFLINE_POOLER_HOST":""}):
   with self.assertRaises(ValueError):require_secure_dsn(DSN)
 def test_approved_pooler_and_full_tls_accepted(self):
  with patch.dict(os.environ,{"PROOFLINE_POOLER_HOST":HOST}):
   self.assertEqual(require_secure_dsn(DSN),DSN)
 def test_insecure_tls_denied(self):
  with patch.dict(os.environ,{"PROOFLINE_POOLER_HOST":HOST}):
   with self.assertRaises(ValueError):require_secure_dsn(DSN.replace("verify-full","require"))
 def test_wrong_project_username_denied(self):
  with patch.dict(os.environ,{"PROOFLINE_POOLER_HOST":HOST}):
   with self.assertRaises(ValueError):require_secure_dsn(DSN.replace("login.pgknyzwctmfqvlivlgpe","login.another_project"))
 def test_direct_ipv6_host_denied(self):
  with patch.dict(os.environ,{"PROOFLINE_POOLER_HOST":HOST}):
   with self.assertRaises(ValueError):require_secure_dsn(DSN.replace(HOST,"db.pgknyzwctmfqvlivlgpe.supabase.co"))
 def test_wrong_pooler_denied(self):
  with patch.dict(os.environ,{"PROOFLINE_POOLER_HOST":"aws-other-region.pooler.supabase.com"}):
   with self.assertRaises(ValueError):require_secure_dsn(DSN)
if __name__=="__main__":unittest.main()
