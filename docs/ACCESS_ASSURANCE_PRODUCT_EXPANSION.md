# Proofline Access Assurance — three-tier expansion contract
**Decision date:** 2026-11-06 | **Prelaunch / NO-GO** | No paid tools, customers or tenant changes authorized.

## Positioning
Who has access to what, why do they still have it, and what evidence supports the controls we rely on?

Proofline is a scoped, read-only assurance provider, not a universal access scanner, Microsoft replacement, SOC, remediation operator, attestation issuer, or authorization to collect private data. Absence of a directory relationship in a complete authorized observation supports only its absence in that bounded source and instant. An owner statement supplies business justification context, **not independent proof** of legitimate necessity.

## Three explicitly distinct offers

| Offer | Commercial positioning | Capability today | What must happen before selling |
|---|---|---|---|
| **Offboarding Evidence Review** | **$1,950 one-time; defined pilot, not yet for sale** | Existing development-tenant collector/review/delivery scaffolding; Lab Bravo evidence observed; independent reviewer still uncontracted | Complete existing scoped release gates, signed reviewer approval of exact report digest, production custody/delivery rehearsals, terms and payment checks |
| **Microsoft 365 Access Assurance Assessment** | **$3,500–$5,000 one-time; hypothesis, NOT FOR SALE** | This branch adds scoped product definition and **synthetic-only** read-only relationship evaluator | Authorize one customer/tenant and a fixed list of selected identities and direct relationships; build actual source collectors, evidence normalization, privilege/group/app-source completeness checks, independent reviewer workflow, full reviewed reports and delivery; confirm pricing economics and capacity |
| **Continuous Access Assurance** | **$299–$799/month; hypothesis, NOT FOR SALE** | This branch adds **synthetic-only** comparison of two normalized snapshots; no scheduler or live monitoring | Implement least-privilege consent/onboarding, credential custody/rotation, scheduled idempotent collectors, scoped baselines and drift detection, errors/retry/backoff, deduplicated alerts, human exception triage, billing/cancellation, retention/deletion, tenant isolation, delivery and recovery testing |

These products share a method and evidence language. They are **not** the same contractual scope or release state. The $1,950 offer remains the sole canonical defined pilot; no expanded offer replaces its terms.

## Access Assurance Assessment: design-level scope
Proposed control families:
1. Selected named identities and observed account/sign-in state (no account-wide coverage claim).
2. Named direct static security-group membership and selected enterprise application assignments.
3. Selected privileged Entra directory-role assignments and scoped role observations, with additional licensed/Graph permissions disclosed at preflight.
4. Business-owner attestation status versus observed technical assignment, with explicit uncertainty.
5. Source completeness, observation time, evidence SHA-256, provenance, attributable exceptions, remediation owner and one independently approved versioned report.

Freeze scope with tenant/object IDs, source capabilities, intended populations, limits on group/role/app relationships, reviewer and owner identities, permitted data/retention and explicit exclusions **before any quote or collection**. Missing permissions, pagination or licensing: NOT_TESTED/INCONCLUSIVE, not PASS. No automated tenant changes; no promise to prove effective downstream application access, hidden links, dynamic/transitive permissions, external SaaS or business necessity.

### Assessment deliverables (future)
- Executive summary explaining observed exposures, exceptions, and limitations.
- Direct access/role/assignment matrix with selected identity/object IDs, source time and evidence ID.
- Owner-attestation/justification register, clearly separated from independent source observations.
- Bounded high-impact exceptions, assigned recommendations and retest criteria.
- Reviewer-signed report digest and secure restricted package plus retrieval/withdrawal receipts.

## Continuous Access Assurance: design-level scope
Proposed collection cadence must be agreed with each customer and not marketed as real-time. Each check has a stable tenant/subject/object scope, baseline hash, observation time, source completeness and immutable evidence lineage. Compare snapshots only after validating same tenant, subject, exact scope and complete source pages. Drift ADDED/REMOVED is an **observation requiring contextual human triage**, not a breach or illegitimate access by itself.

Preproduction needs: authenticated tenant admin consent, least privilege, secure rotation and recovery of secrets, isolation, job scheduler, bounded rate limits, pagination/retry, dead-letter/incomplete-state alerts, deduplication, review and exception routing, retention and deletion verification, failure injection and backup restoration, customer support, cancellation, month-to-month billing acceptance and realistic costs. Do not start a subscription until operations prove they can meet its defined cadence and limits.

## Safety and engineering boundary
- `proofline-stage/product/access-assurance-catalog.json` is authoritative draft product metadata, with four commercial locks set false.
- `validate-catalog.mjs` rejects unauthorized activation or materially changed status/prices.
- `synthetic-access-evaluator.mjs` is **offline and accepts synthetic fixtures only**. It provides scoped relational observation and snapshot comparison, not Microsoft Graph collection, independent human review, report custody or live monitoring.
- `*.test.mjs` plus the catalog CI workflow exercise missing pages, cross-tenant drift, dynamic relationships, owner-attestation boundaries and commercial locks.
- Do not mix these checks with a paid-service release claim. A passing test means only that the specified software contracts hold.

## Release progression and acceptance
1. Finish the existing offboarding pilot (real authorized collection, signed independent reviewer, three measured delivery/withdrawal/recovery cycles, approved customer/data terms and billing acceptance).
2. Design/implement an independent Assessment proof-of-concept on approved development-tenant identities. Require role and assignment completeness, test privilege escalation negative paths, source digests, scope freezes, human review and checked report.
3. Demonstrate the continuous snapshot evaluator against two **authorized real-source** observations only after secure consent and custody are approved. Validate changes, no-change, pagination failures, revocation, tenant isolation, retries and retention.
4. Validate demand and costs with real buyer quotes and reviewer estimates; get explicit approval before creating any customer intake, paid billing or delivery channel. Broader tiers have **no preapproved launch date**.

## Release disposition
**NO-GO.** The expanded ladder is now a documented and coded prototype, not three commercially ready services. The independent reviewer and secure delivery acceptance remain blocking prerequisites for the original pilot.
