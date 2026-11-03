"""Proofline sealed staging gateway; NO customer/data API."""
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlsplit
import json, os
class Handler(BaseHTTPRequestHandler):
    server_version = ""
    sys_version = ""
    def version_string(self): return ""
    def _reply(self,status,data,head=False):
        body=json.dumps(data,separators=(",",":")).encode("utf-8")
        self.send_response(status)
        for key,value in [
            ("Content-Type","application/json; charset=utf-8"),
            ("Content-Length",str(len(body))),
            ("Cache-Control","no-store"),
            ("X-Content-Type-Options","nosniff"),
            ("X-Frame-Options","DENY"),
            ("Referrer-Policy","no-referrer"),
            ("Content-Security-Policy","default-src 'none'; frame-ancestors 'none'; base-uri 'none'")]:
            self.send_header(key,value)
        self.end_headers()
        if not head:self.wfile.write(body)
    def _read(self,head=False):
        path=urlsplit(self.path).path
        if path=="/healthz":
            return self._reply(200,{"service":"proofline-staging","state":"sealed","intake":"disabled"},head)
        if path=="/readyz":
            return self._reply(503,{"ready":False,"reason":"offline_acceptance_pending"},head)
        if path.startswith("/v1/"):
            return self._reply(403,{"detail":"tenant_api_disabled"},head)
        return self._reply(404,{"detail":"not_found"},head)
    def do_GET(self):self._read()
    def do_HEAD(self):self._read(head=True)
    def do_POST(self):self._reply(403,{"detail":"writes_disabled"})
    do_PUT=do_POST
    do_PATCH=do_POST
    do_DELETE=do_POST
    def log_message(self,fmt,*args):pass
def upstream_diagnostic_check():
    """Only a one-time read-only cloud connectivity check, never an API proxy."""
    import urllib.request
    import urllib.error
    token = os.environ.get("PROOFLINE_STAGING_ANON_JWT", "")
    if not token or len(token) > 8192:
        return False
    target = "https://pgknyzwctmfqvlivlgpe.supabase.co/functions/v1/proofline-staging-health/health"
    request = urllib.request.Request(target, method="GET", headers={
        "Authorization": "Bearer " + token,
        "apikey": token,
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            if response.status != 200:
                return False
            body = json.loads(response.read(2048))
            return body.get("state") == "sealed_controls_verified" and body.get("customer_intake") == "disabled"
    except (urllib.error.URLError, OSError, ValueError, UnicodeError):
        return False

def auth_gate_negative_check():
    """Anonymous project JWT must not authorize a collector or reviewer."""
    import urllib.request
    import urllib.error
    token = os.environ.get("PROOFLINE_STAGING_ANON_JWT", "")
    if not token or len(token)>8192:
        return False
    url = ("https://pgknyzwctmfqvlivlgpe.supabase.co/functions/v1/"
           "proofline-staging-auth/check?tenant="
           "bbbbaaaa-1111-4111-8111-000000000001&role=collector")
    request = urllib.request.Request(url, method="GET", headers={
        "Authorization": "Bearer " + token,
        "apikey": token,
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(request,timeout=8) as response:
            return False  # ANY success here fails the negative security test
    except urllib.error.HTTPError as e:
        return e.code in (401,403)
    except (urllib.error.URLError,OSError,ValueError,UnicodeError):
        return False

def main():
    if os.getenv("PROOFLINE_STAGE_MODE")!="sealed":
        raise SystemExit("Sealed staging only; refusing startup")
    port=int(os.environ.get("PORT","10000"))
    if not 1024<=port<=65535:raise SystemExit("Invalid port")
    print("proofline_upstream_staging_db=" + ("verified" if upstream_diagnostic_check() else "unverified"), flush=True)
    print("proofline_auth_negative=" + ("denied" if auth_gate_negative_check() else "unverified"), flush=True)
    ThreadingHTTPServer(("0.0.0.0",port),Handler).serve_forever()
if __name__=="__main__":main()
