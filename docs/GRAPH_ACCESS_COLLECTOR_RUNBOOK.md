# Proofline Microsoft Graph Access Assurance Collector — Controlled Pilot

**Status: DEVELOPMENT ONLY.** This implementation supports read-only, explicitly scoped observations of a single approved user and selected direct relationships. It has **not** been run against the development tenant in this change. No external customer data is authorized. A successful collection is **not** an independent assurance report.

## Scope / approvals
- Use the existing Proofline Lab development tenant only with explicit operator approval. Freeze the tenant ID, one approved test-user ID and 1–50 selected immutable IDs in a local JSON scope. No broad discovery or bulk collection.
- Record owner-approved authorization and approved evidence destination separately from the scope file; the boolean fields in JSON are an execution guard, **not legal proof of authorization**.
- Obtain a short-lived delegated Microsoft Graph access token through your approved interactive process; do **not** paste tokens into chat, source code, logs, email, or GitHub. The CLI reads `PROOFLINE_GRAPH_TOKEN` only from its process environment.
- Permission requirements depend on the chosen relationships: organization/user read, group membership, app-role assignments, and directory role assignments. Seek the least-privileged documented delegated permissions that return all requested data. Insufficient permissions or licensing means NO-GO, never PASS.
- Treat group IDs as group object IDs; enterprise-app IDs as **resource service principal IDs**, not individual app-role IDs; directory-role IDs as **role definition IDs**. The latter two represent direct assignments only.
- This collector does not query PIM eligible roles, transitive membership, nested group effects, dynamic group effective membership, mailbox grants, or external SaaS sessions.

## Operator steps (no live run has been performed)
1. Create a scope file outside GitHub containing `authorized:true`, `owner_approved:true`, `read_only:true`, `tenant_id`, `subject_id`, and an array of `relationships` with `kind` in `static_group`, `enterprise_app_assignment`, `directory_role` and immutable `id`. Confirm all IDs with the approved tenant owner.
2. Run local unit tests: `node --test proofline-stage/product/*.test.mjs`. Tests use an injected fake transport; no network.
3. With an approved ephemeral token in `PROOFLINE_GRAPH_TOKEN` and `PROOFLINE_ALLOW_LIVE_GRAPH=YES`, run `node proofline-stage/product/collect-graph-cli.mjs <scope.json> <new-output.json>`. **Do not** use a shared or public output path.
4. Verify returned tenant/user IDs, requested relationship IDs, permission completeness and pagination, timestamps, source hash, source limitations, and actual observed results. Record collection identity and authorization in the external custody register. No source data is written to GitHub.
5. Build an **internal, unreviewed** report packet from the authorized collector output using the separate real-source bridge: \`node proofline-stage/product/graph-review-packet.mjs build <new-output.json> <approved-scope.json> <new-private-packet-directory>\`. Verify independently: \`node proofline-stage/product/graph-review-packet.mjs verify <new-private-packet-directory>\`. The existing synthetic-only package builder remains unchanged. Do not treat the output as a customer report.
6. Complete independent human review, exact report hash approval, authenticated package delivery/withdrawal/recovery rehearsals, and signed commercial acceptance before any sale.

## Failure behavior
- Fail closed for missing authorization flags, invalid IDs, unsupported/dynamic scope, unexpected tenant/user, missing Graph page values, pagination cycles or endpoint changes, permission failures, over-budget responses, and out-of-scope assignments.
- No writes to Microsoft Graph are implemented. The CLI uses only GET and refuses redirects.
- The source hash is a digest of normalized collector output, **not** a signed Microsoft audit receipt. Independently authenticate and preserve original Graph source data before asserting audit-grade provenance.

## Security caveats before production
- This version does not validate cryptographic JWT claims locally; it relies on Graph authorization plus explicit organization/user response checks. Production deployment requires token-claim validation and a secure identity/consent broker.
- Application-role assignments may have multiple roles on one resource; this collector reduces them to resource presence and **must not** claim which role or effective permission is held.
- Direct directory role assignments do not prove absence of PIM eligible, group-derived or other privileged access.
- No schedule, subscription, encryption-at-rest service, retention automation, tenant isolation, or customer delivery is implemented.

**Release decision: NO-GO.** The real-source bridge verifies consistency of normalized local collector output, not Microsoft-signed provenance. A reviewer must independently authenticate original source records and approve the exact report digest.
