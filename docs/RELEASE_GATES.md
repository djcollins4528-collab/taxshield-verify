# Proofline release gates

All customer activation switches remain off. Partial evidence is not PASS.
The machine-readable record is release-gates.json. Existing enforcement in
proofline-stage/release/production-readiness.json remains intact.

| Gate | State | Missing evidence |
|---|---|---|
| A Security | BLOCKED | Genuine independent identities; full cross-tenant resource coverage |
| B Reliability | BLOCKED | Complete operational customer workflow; synthetic report read passes |
| C Evidence integrity | BLOCKED | Production artifact chain and independent custody acceptance |
| D Browser acceptance | BLOCKED | Real authenticated workflow, manual accessibility, device acceptance |
| E Recovery | BLOCKED | Production-equivalent restore and independent verification |
| F Customer workflow | BLOCKED | Full inquiry-to-delivery-to-reverification rehearsal |
| G Commercial readiness | BLOCKED | Reviewed scope, legal terms, onboarding, support and launch prerequisites |
| H Billing readiness | BLOCKED | Sandbox reconciliation, failure and refund acceptance |
| I Owner authorization | BLOCKED | Explicit intake, customer data and live-payment approvals |

Database preflight currently passes private grants, private RLS, observed revocation,
and synthetic tenant checks. Confirmed collector/reviewer, live sessions and genuine
live acceptance checks remain false. Synthetic account creation must not satisfy them.
