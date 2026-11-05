# Synthetic followup API — 2026-11-04 (America/New_York)

Historical v1 record. The subsequent v2 deployment and role-aware UI acceptance
are recorded in FOLLOWUP_WORKBENCH_ACCEPTANCE.md.

`proofline-staging-followups` v1 is ACTIVE in the existing staging project
`pgknyzwctmfqvlivlgpe`, with platform JWT verification enabled. Bundle SHA-256:
`0320e8ce9e507905773f2b8a0777ea85feaf3435e486ed387ca0f14446884203`.
This is a staging API milestone, not completed customer delivery or real-session
followup acceptance. No schema changes, client grants or report changes were made.

## Contract

- `POST /functions/v1/proofline-staging-followups/append`: exact JSON fields
  `artifact_id`, `expected_sha256`, `review_decision_id`, `finding_id`, `sequence`,
  `previous_id`, `kind`, `outcome`, `evidence`. Start with sequence 1, null
  predecessor, remediation kind and null outcome. Later events name their previous
  event and alternate according to the existing database trigger.
- Evidence has exactly `classification="SYNTHETIC_STAGING_ONLY"`,
  `customer_data=false`, `observation`, `criterion`, `limitations`. The latter three
  are plain strings of 15–4000, 15–2000 and 15–2000 characters respectively.
  The request's streamed bytes are capped at 20,000; evidence is capped at 15,000
  JSON UTF-8 bytes to leave room under the database's 16 KiB jsonb-text limit.
- Reverification accepts PASS, FAIL, INCONCLUSIVE, NOT_TESTED or NOT_APPLICABLE.
  A PASS has no effect on approval, the original report, billing or delivery.
- `GET /functions/v1/proofline-staging-followups/history?artifact_id=UUID&finding_id=ID&after_sequence=0`:
  collector/reviewer access, up to 100 events ordered by sequence. Continue with
  `next_after_sequence` when non-null. History omits actor/session identifiers.
  Empty history does not establish remediation success or customer readiness.
- Both operations use no-store responses. A verified Auth user and matching JWT
  session claims are required. The database adapter checks the current session,
  confirmed/nonanonymous/unbanned user and active staging role membership.
  Actor/session are server-derived; caller-supplied identities, tenants and digests
  for new evidence are rejected. Memberships and client-writable metadata are never
  substituted for verified Auth. Only the pinned synthetic tenant and intact draft
  artifact/finding are eligible. The existing append trigger enforces the decision,
  predecessor, identity separation, role/session, digest and append-only rules.
- PostgreSQL values are parameterized. This follows the existing review APIs'
  privileged server-only DB connection pattern, with explicit authorization checks;
  it does not grant browser access to the private schema. Administrative database
  credentials remain trusted. Database conflicts return 409; refresh history rather
  than silently retrying with an altered sequence. Constraint denials return generic
  403 responses, infrastructure failures generic 503 responses without SQL details.

## Evidence and limits

- 32 Node tests pass for the actual handler/policy and mocked database adapter.
  They cover verified claims, injected identities, missing/expired/wrong claims,
  rejected origins, request byte limits, ambiguous history parameters, evidence,
  authorization denials, pagination, conflict and error handling.
- 36 existing authorization/release-gate Node tests and four migration-inventory
  tests pass. No database migrations changed; the prior 21 isolated followup SQL
  assertions were not rerun here because this runtime has no Docker/PostgreSQL.
- Supabase successfully built/deployed the entrypoint and its relative dependencies.
  The insertion statement also passes read-only EXPLAIN against the staging schema;
  EXPLAIN does not execute an insert or its trigger and is not write acceptance.
- Two live HTTPS checks against the deployed history route return 401: missing
  bearer and invalid bearer. These prove the platform gateway denies those callers;
  they do not execute the new handler or establish downstream Auth/DB connectivity.
- After deployment, staging has zero followup rows, zero Auth sessions and two
  retained approved Auth users; all report artifacts remain locked drafts.
- Current Supabase Auth/Edge documentation and changelog were consulted. The
  existing pinned getUser-based authentication pattern is retained.

Next: add workbench controls, then exercise real collector remediation → reviewer
INCONCLUSIVE → another remediation → reviewer PASS, plus wrong-role, revoked-session,
duplicate and cross-finding denials. Retain all immutable history, end test sessions,
and verify the original draft/review and delivery locks. Owner-controlled aliases
still do not establish independent human review. No production gate is promoted.

Reproduce local tests:
`node --test proofline-stage/supabase/proofline-staging-followups/handler.test.mjs`.
The dedicated GitHub workflow runs this suite without secrets or hosted mutations.
Rollback by removing the new function through the dashboard; existing APIs and
stored ledger history do not need modification.
