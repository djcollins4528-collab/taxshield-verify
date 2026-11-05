# Staging remediation and reverification acceptance

On November 5, 2026 the collector attached synthetic evidence to finding PL-SYN-002
through the deployed Chromium workbench. The reviewer retrieved that entry in WebKit
and recorded an INCONCLUSIVE retest. Separate sign-ins retrieved the linked
history in both engines. The original verification criterion calls for externally
reviewed evidence. Both staging identities belong to the same owner.

| Sequence | Entry | Retained event |
|---|---|---|
| 1 | Remediation | 3b75fc22-05c3-4c8f-8950-bc47b76e9391 |
| 2 | Reverification, INCONCLUSIVE | 7b5b3f6f-10d7-416d-b5a3-f6ea4cc9de62 |

Read-only database verification found two distinct actors and originating sessions,
matching evidence SHA-256 values, a valid predecessor link, and the original locked
draft and change-request decision. All sessions had closed after the exercise.

During acceptance, an out-of-date checkout temporarily replaced the staging
followup handler. I restored the shared branch implementation as v4 and verified
that its deployed bundle SHA-256 matched the prior v2 bundle exactly. The live
exercise created both entries on that restored code. The Vercel workbench continued
to serve its established deployment.

API v5 adds string type checks for artifact IDs, review decision IDs and expected
digests. This prevents single-element JSON arrays from passing regex validation
by implicit conversion. The 37 handler tests passed. A second live exercise on v5
passed 16 named checks, retained both original entries and created zero new rows.
It covered duplicate requests, role violations, forged actor IDs, malformed artifact
IDs, revoked sessions and readback through fresh sessions. The two JSON receipts
in this directory identify the separate runs.

Run `node live-followup-acceptance.mjs` from `proofline-stage/web-tests` with the
approved staging credentials in the live-auth operator environment and
`PROOFLINE_RECORD_SYNTHETIC_FOLLOWUP=yes`. The runner verifies existing entries
before resuming an interrupted exercise, refuses unexpected history and signs out
each session. `PROOFLINE_ACCEPTANCE_OUTPUT` selects an optional JSON receipt path.

The next engineering gate is a synthetic recipient handoff rehearsal, including
recipient authentication, package integrity and access withdrawal. The sale decision
continues to require independent review, authorized evidence collection and billing
sandbox acceptance. Customer intake and live payments require owner authorization.
