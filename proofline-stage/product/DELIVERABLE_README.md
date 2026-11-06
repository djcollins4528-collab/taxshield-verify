# Verifiable Access Assurance demonstration package

This is a **synthetic-only**, offline, deterministic proof of the customer deliverable format. It produces three files:

- `assessment.json`: machine-readable, scoped findings and source references.
- `report.md`: human-readable findings with conspicuous **NOT INDEPENDENTLY REVIEWED** disclosure.
- `manifest.json`: SHA-256 digests and byte lengths for both files.

Build and independently verify from repository root:

```sh
node proofline-stage/product/deliverable-package.mjs build proofline-stage/product/fixtures/synthetic-assessment.json /tmp/proofline-demo
node proofline-stage/product/deliverable-package.mjs verify /tmp/proofline-demo
node --test proofline-stage/product/*.test.mjs
```

The build fails rather than overwriting any existing package file. Verification fails on missing files, changed content, inconsistent manifest, or a false review/delivery status. There is no Microsoft Graph access, sensitive customer information, external delivery, human reviewer signature, payment or subscription.

## Next production integration gates
1. **Authorized collection**: explicit signed tenant and object scope; least-privilege Microsoft Graph collection with all-page traversal, capability/permission checks, source provenance, clock and failure evidence. Synthetic-only guard must not be lifted until separate real-source test and owner authorization.
2. **Customer report**: independently reproducible findings, factual scope and limitations, PDF renderer, redaction, source citations, source retention and tamper-evident package generation.
3. **Independent reviewer**: separate accountable person, reviewer access restricted to approved evidence, conflict declaration, review decision bound to exact report digest, tracked corrections and final signoff.
4. **Secure delivery**: approved recipient authentication, delivery/download receipts, withdrawal, same-session and fresh-sign-in denial, restoration/recovery and three measured rehearsals.
5. **Commercial acceptance**: signed terms, reviewer capacity, secure intake, billing test, support/cancellation/refund handling, explicit owner approval. Do not enable paid services until these gates pass.

**NO-GO** for external delivery, independent assurance claims or subscriptions. A verified synthetic package demonstrates *artifact integrity and reproducibility*, not the validity of an external security finding.
