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
def main():
    if os.getenv("PROOFLINE_STAGE_MODE") not in ("sealed","sealed_db_probe"):
        raise SystemExit("Sealed staging only; refusing startup")
    port=int(os.environ.get("PORT","10000"))
    if not 1024<=port<=65535:raise SystemExit("Invalid port")
    ThreadingHTTPServer(("0.0.0.0",port),Handler).serve_forever()
if __name__=="__main__":main()
