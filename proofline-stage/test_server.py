import importlib.util, json, threading, unittest
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from pathlib import Path
spec=importlib.util.spec_from_file_location("gateway",Path(__file__).with_name("server.py"))
gateway=importlib.util.module_from_spec(spec);spec.loader.exec_module(gateway)
class SealedGatewayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=ThreadingHTTPServer(("127.0.0.1",0),gateway.Handler)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
        cls.url="http://127.0.0.1:"+str(cls.server.server_port)
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close()
    def request(self,path,method="GET",body=None):
        try:
            with urlopen(Request(self.url+path,data=body,method=method),timeout=2) as r:
                return r.status,r.read(),r.headers
        except HTTPError as e:return e.code,e.read(),e.headers
    def test_health_is_sealed(self):
        status,body,_=self.request("/healthz")
        self.assertEqual(status,200);self.assertEqual(json.loads(body)["state"],"sealed")
    def test_not_ready(self):
        status,_,_=self.request("/readyz");self.assertEqual(status,503)
    def test_customer_writes_denied(self):
        for method in ("POST","PUT","PATCH","DELETE"):
            code,_,_=self.request("/v1/tenants/synthetic/evidence",method,b"{}")
            self.assertEqual(code,403)
    def test_internal_routes_hidden(self):
        for path in ("/docs","/openapi.json","/.env","/"):
            code,_,_=self.request(path);self.assertEqual(code,404)
    def test_sealed_headers(self):
        _,_,h=self.request("/healthz")
        self.assertEqual(h["Cache-Control"],"no-store")
        self.assertEqual(h["X-Frame-Options"],"DENY")
        self.assertIn("default-src 'none'",h["Content-Security-Policy"])
    def test_head_no_body(self):
        code,body,_=self.request("/healthz","HEAD")
        self.assertEqual(code,200);self.assertEqual(body,b"")
if __name__=="__main__":unittest.main()
