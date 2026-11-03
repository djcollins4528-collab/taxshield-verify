"""No-network fail-closed tests for manual official Supabase Auth acceptance."""
import importlib.util,os,unittest
from pathlib import Path
from unittest.mock import patch
P=Path(__file__).with_name("positive_auth_acceptance.py")
spec=importlib.util.spec_from_file_location("positive_auth_acceptance",P)
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
def env():
    return {'PROOFLINE_PUBLIC_API_KEY':'sb_publishable_test',
     'PROOFLINE_COLLECTOR_EMAIL':'collector@example.invalid','PROOFLINE_COLLECTOR_PASSWORD':'synthetic',
     'PROOFLINE_REVIEWER_EMAIL':'reviewer@example.invalid','PROOFLINE_REVIEWER_PASSWORD':'synthetic'}
class Acceptance(unittest.TestCase):
    def test_requires_protected_credentials(self):
        with patch.dict(os.environ,{},clear=True):
            with self.assertRaisesRegex(RuntimeError,'Missing test-only'):a.run()
    def test_rejects_service_role_as_input_key(self):
        p=env();p['PROOFLINE_PUBLIC_API_KEY']='service_secret'
        with patch.dict(os.environ,p,clear=True):
            with self.assertRaisesRegex(RuntimeError,'Only public'):a.run()
    def test_requires_two_distinct_emails(self):
        p=env();p['PROOFLINE_REVIEWER_EMAIL']=p['PROOFLINE_COLLECTOR_EMAIL'].upper()
        with patch.dict(os.environ,p,clear=True):
            with self.assertRaisesRegex(RuntimeError,'Two distinct'):a.run()
    def test_accepts_only_expected_role_matrix(self):
        with patch.dict(os.environ,env(),clear=True),patch.object(a,'signin',side_effect=[('token-c','user-c'),('token-r','user-r')]),patch.object(a,'check',side_effect=[200,200,403,403,403,403]) as checked:
            a.run()
            self.assertEqual(checked.call_count,6)
    def test_fails_if_positive_reviewer_cannot_signin(self):
        with patch.dict(os.environ,env(),clear=True),patch.object(a,'signin',side_effect=[('token-c','user-c'),('token-r','user-r')]),patch.object(a,'check',side_effect=[200,403]):
            with self.assertRaisesRegex(RuntimeError,'reviewer correct role'):a.run()
if __name__=='__main__':unittest.main()
