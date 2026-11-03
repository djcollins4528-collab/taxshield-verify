#!/usr/bin/env python3
"""Fail-closed static-site checks for the Proofline prelaunch web surface."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import re
import unittest

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/"proofline"

class Inventory(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links=[]
        self.forms=[]
        self.scripts=[]
        self.inline_handlers=[]
        self.ids=set()
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if "id" in a:self.ids.add(a["id"])
        if tag=="a" and a.get("href"):self.links.append(a["href"])
        if tag=="form":self.forms.append(a)
        if tag=="script":self.scripts.append(a)
        self.inline_handlers += [(tag,k) for k,_ in attrs if k.startswith("on")]

class PublicSiteGates(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages=list(SITE.glob("*.html"))
        cls.parsed={}
        for p in cls.pages:
            parser=Inventory()
            parser.feed(p.read_text(encoding="utf-8"))
            cls.parsed[p]=parser

    def test_critical_pages_exist(self):
        for name in ("index.html","method.html","demo.html"):
            self.assertTrue((SITE/name).is_file(),name)

    def test_all_internal_links_resolve(self):
        for path,doc in self.parsed.items():
            for link in doc.links:
                u=urlsplit(link)
                if u.scheme or u.netloc or link.startswith(("mailto:","tel:")):
                    continue
                target=(SITE/(u.path or path.name)).resolve()
                self.assertTrue(target.is_relative_to(SITE.resolve()),f"link escapes site: {link}")
                self.assertTrue(target.is_file(),f"{path.name}: broken link {link}")
                if u.fragment:
                    target_doc=self.parsed.get(target)
                    if target_doc:
                        self.assertIn(u.fragment,target_doc.ids,f"{path.name}: missing anchor {link}")

    def test_no_payment_or_sensitive_intake(self):
        for p,doc in self.parsed.items():
            self.assertEqual(doc.forms,[],f"{p.name}: public form unexpectedly introduced")
            content=p.read_text(encoding="utf-8")
            self.assertNotRegex(content,r"(?i)<input[^>]+type=[\"']?(password|file)")
            self.assertNotRegex(content,r"(?i)checkout\.stripe\.com|buy\.stripe\.com")

    def test_no_inline_executable_javascript(self):
        for p,doc in self.parsed.items():
            self.assertFalse(doc.inline_handlers,f"{p.name}: inline handlers violate strong CSP")
            for s in doc.scripts:
                self.assertTrue(s.get("src"),f"{p.name}: inline script")
                self.assertFalse(urlsplit(s["src"]).scheme,f"{p.name}: external script")

    def test_demo_honestly_disclosed(self):
        s=(SITE/"demo.html").read_text(encoding="utf-8").lower()
        self.assertIn("fictional",s)
        self.assertIn("not a customer assessment",s)

    def test_prelaunch_language(self):
        home=(SITE/"index.html").read_text(encoding="utf-8").lower()
        self.assertIn("prelaunch",home)
        self.assertTrue(any(word in home for word in ("not available","availability","pilot")))

    def test_no_hidden_env_or_secrets(self):
        for p in SITE.rglob("*"):
            if not p.is_file():continue
            self.assertFalse(p.name.startswith(".env"),str(p))
            self.assertNotIn("PRIVATE KEY",p.read_text(encoding="utf-8",errors="replace"))

if __name__=="__main__":
    unittest.main(verbosity=2)
