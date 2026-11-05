# Synthetic pilot package quality gate

This is an **engineering-only acceptance contract**, not proof of a customer delivery,
independent human reviewer, a production PDF renderer, or permission to sell.
Launch, public customer intake, real evidence collection, and payments stay disabled.

Run `node --test proofline-stage/ci/verify-pilot-package.test.mjs`.
A valid synthetic fixture is represented by a JSON manifest and files alongside it.
Invoke `node proofline-stage/ci/verify-pilot-package.mjs /path/to/manifest.json`
to check an assembled synthetic package. The script exits nonzero with
`PACKAGE_NO_GO` for missing/incorrect material.

Required initial artifacts: `assessment_pdf`, `evidence_register`,
`remediation_worksheet`. A retest phase also requires `retest_addendum`.
Each manifest artifact has `path`, `sha256`, `case_id`, and `reviewed_version`.
The manifest includes `schema_version:1`, `synthetic:true`, `phase`,
`version`, `case_id`, `tenant_id`, `subject_id`, `departure_at`,
`collection_cutoff_at`, `readiness_at`, `report_completed_at`,
`delivery_approved:false`, and `scope.relationship_ids` (up to five).

The manifest also contains an evidence array with unique IDs, source,
collection timestamp and SHA-256; findings with unique IDs, matching case IDs,
one mandatory sign-in and one revocation result, plus a result for each scoped
relationship, criteria and supported evidence references; remediation worksheet
rows for every FAIL/INCONCLUSIVE/NOT_TESTED; and a `review` object.
Review fields include distinct collector/reviewer IDs, `reviewed_at`,
`approved:true`, `independent_human_verified:true`,
`independence_receipt_id`, and the exact reviewed PDF digest.
**These are assertions in a fixture**, not independent verification of human
identity. A real approval workflow must authenticate/verify the independent
reviewer and match the immutable server-side review before it may rely on them.

The checker verifies exact bytes for listed artifact SHA-256 values, PDF
signature/end marker, report/review digest consistency, evidence references,
reviewer != collector, scoped identities, seven-day observation window,
phase-specific retest addendum, preservation of original report hash and
the absence of an unlocked delivery flag. It does **not** parse PDF contents
semantically, verify external evidence hashes against source exports, validate
an actual reviewer relationship, prove secure delivery, or check business-day SLA.
Those require separate end-to-end acceptance tests before the release gate opens.

This tool must remain synthetic-only. Never feed it raw customer data or
treat a passing result as authorization to issue a package. Integrate its
contract into the actual renderer/handoff path only after the real-tenant
collection and independently accountable reviewer gates have been established.
