"""Public, no-secret smoke tests for a SEALED Proofline gateway.

Never send customer records. If /readyz becomes 200 or evidence POST is accepted,
fail the release rather than declaring the private API ready.
"""
import json
import time
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = "https://proofline-sealed-staging.onrender.com"

def request(method, path, body=None):
    req = Request(ROOT + path, method=method, data=body, headers={
        "Content-Type": "application/json", "Accept": "application/json"})
    for attempt in range(2):
        try:
            with urlopen(req, timeout=45) as response:
                raw = response.read(2048)
                return response.status, json.loads(raw), dict(response.headers)
        except HTTPError as error:
            return error.code, json.loads(error.read(2048)), dict(error.headers)
        except (URLError, TimeoutError):
            if attempt == 1:
                raise
            time.sleep(5)

class ProoflinePublicSealedCanary(unittest.TestCase):
    def test_health_remains_sealed(self):
        status, data, headers = request("GET", "/healthz")
        self.assertEqual(status, 200)
        self.assertEqual(data.get("state"), "sealed")
        self.assertEqual(data.get("intake"), "disabled")
        self.assertEqual(headers.get("Cache-Control"), "no-store")

    def test_readiness_never_enabled(self):
        status, data, _ = request("GET", "/readyz")
        self.assertEqual(status, 503)
        self.assertIs(data.get("ready"), False)

    def test_evidence_write_is_denied(self):
        status, _, _ = request("POST", "/v1/tenants/00000000-0000-4000-8000-000000000000/evidence",
                               b'{"payload":{"synthetic":true}}')
        self.assertEqual(status, 403)

if __name__ == "__main__":
    unittest.main()
