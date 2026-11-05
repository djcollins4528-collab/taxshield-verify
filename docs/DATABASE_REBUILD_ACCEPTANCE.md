# Proofline database rebuild and integrity acceptance — 2026-11-04

## Change
Recovered 36 existing migrations and recorded newly deployed migration
`20261104142004_proofline_append_only_truncate_and_complete_report_contract`.
The isolated baseline reproduced five missing TRUNCATE guards and a report constraint
that admitted missing JSON keys. Client table access was already denied; these were
defense-in-depth database invariants, not demonstrated public access vulnerabilities.

Added statement triggers for membership audit, report artifacts, review decisions,
synthetic acceptance receipts and HTTP rehearsal receipts. Added an additive report
constraint requiring the complete locked draft contract and actual JSON booleans.
PostgreSQL CHECK expressions accept NULL unless explicitly rejected:
https://www.postgresql.org/docs/17/ddl-constraints.html
TRUNCATE requires statement-level trigger coverage:
https://www.postgresql.org/docs/17/sql-createtrigger.html

## Evidence
- Implementation commit: 5044d05; hosted rebuild passes:
  https://github.com/djcollins4528-collab/taxshield-verify/actions/runs/41847276588
- Recovered source: 37 timestamped migrations with SHA-256 manifest.
- Disposable, network-isolated PostgreSQL 17: 35 migrations replayed, 2 explicitly excluded pg_net operations.
- Live catalog comparison: all 7 captured categories match (15 tables, 146 columns,
  108 constraints, 14 triggers, 16 policies, 22 functions, 109 table grants).
- Security acceptance: 21/21 SQL assertions pass, including valid report insertion.
- Inventory protection: 4/4 Python tests pass.
- Live staging migration applied successfully; six ledger TRUNCATE guards present
  including the pre-existing custody guard. Existing artifact passed new constraint.
- Post-change HTTP rehearsal: 17/17, receipt `e719f677-4b38-4afc-a37b-a5d517ffa2e9`,
  reviewer report retrieval succeeds and cleanup is confirmed.
- No live destructive probes were run; TRUNCATE probes ran only in disposable local DB.

## Limits and next dependency
This closes application migration-source reconciliation for captured catalog fields.
It does not close production recovery: actual evidence/key restoration, independent
custody and Supabase Auth/network integration remain separate gates. Existing client
access restrictions and customer intake/payment locks remain intact.

Next: approved genuine collector/reviewer browser acceptance, then the full synthetic
purchase-to-delivery/reverification rehearsal. No revenue or paid pilot is claimed.
The pilot scope draft remains `docs/PILOT_DELIVERY_BRIEF.md` and requires an operational
delivery workflow and owner approvals before becoming a customer offer.
