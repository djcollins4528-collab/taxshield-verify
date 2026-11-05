# Proofline release gates

All customer activation switches remain off. Partial evidence is not PASS.
The machine-readable record is release-gates.json. Existing enforcement in
proofline-stage/release/production-readiness.json remains intact.

| Gate | State | Missing evidence |
|---|---|---|
| A Security | BLOCKED | Genuine independent identities; full cross-tenant resource coverage |
| B Reliability | BLOCKED | Complete operational customer workflow; synthetic report read passes |
| C Evidence integrity | BLOCKED | Production artifact chain and independent custody acceptance |
| D Browser acceptance | BLOCKED | Full workflow, manual accessibility, device acceptance; real owner-controlled sign-in/report/decision subset passes |
| E Recovery | BLOCKED | Production-equivalent restore and independent verification |
| F Customer workflow | BLOCKED | Full inquiry-to-delivery-to-reverification rehearsal |
| G Commercial readiness | BLOCKED | Offer v1.0 defined; legal terms, onboarding, support, actual cost verification and launch prerequisites still open |
| H Billing readiness | BLOCKED | Sandbox reconciliation, failure and refund acceptance |
| I Owner authorization | BLOCKED | Explicit intake, customer data and live-payment approvals |

Database preflight currently passes private grants, private RLS, observed revocation,
and synthetic tenant checks. Confirmed collector/reviewer checks now pass (6/9 total).
Live sessions are intentionally closed and database-recorded live acceptance remains
false; no synthetic acceptance markers were promoted to production evidence.
Real owner-controlled browser/API acceptance is recorded separately. Independent
human review and the full delivery workflow remain outstanding.
