# Proofline first-pilot offer — version 1.0

Defined 2026-11-04 (America/New_York). **Definition complete; PRELAUNCH / NOT FOR SALE.**
Canonical specification for launch checklist #1. This replaces the earlier broad
review/subscription hypotheses for the first pilot. It neither accepts an engagement
nor authorizes expenditure. Contract formalization belongs to checklist #3. Intake,
customer collection, approval, delivery and payments remain locked.

## Service, customer and promise

**Microsoft Entra Offboarding Evidence Review — $1,950 USD fixed, one-time.**

Initial customer: a US architecture or engineering firm with 10–100 staff using
Microsoft 365 Commercial, with an authorized administrator and a recently departed
employee who has one cloud-only Entra member account. Buyer: managing partner,
operations director or IT lead. An MSP may assist; customer authorization is required.
First-pilot capacity is one engagement at a time. This is an operator-led assessment.

Customer promise: “We review the agreed Microsoft Entra offboarding controls for one
departed employee, show which conclusions the available evidence supports, identify
exceptions and include one retest after your administrator makes changes.”

The result concerns named directory controls at recorded observation times. It does
not establish that the person lost every means of accessing Microsoft 365 or other
business systems. There is no recurring monitoring or subscription in this offer.

## Fixed scope

| Dimension | Included boundary |
|---|---|
| Customer/tenant | One organization and one Microsoft 365 Commercial / Entra tenant |
| Identity | One existing cloud-only member user, pinned by object ID and UPN |
| Departure | One customer-recorded effective departure time within seven calendar days before kickoff |
| Controls | Sign-in disabled; evidence of customer-performed session revocation after departure; removal of up to five named directory relationships |
| Relationships | Five total across selected static group memberships and direct enterprise-application assignments; object IDs listed before kickoff |
| Window | Departure effective time through initial collection cutoff, at most seven calendar days; one current-state observation in that interval |
| Mandatory sources | Read-only Graph/Entra user state, named memberships/assignments and available attributable directory-audit records for the agreed changes |
| Optional context | Available retained sign-in events for the identity/window; availability checked at preflight; no separate coverage promise |
| Collection | One initial collection and one collection for the included retest |
| Meetings | One 30-minute kickoff and one 30-minute debrief |
| Retest | One round, same tenant, identity, controls and original named relationships |

Preflight must verify mandatory-source access, adequate retained records, supported
relationship types and collector/reviewer availability before payment or kickoff.
Readiness includes a scheduled initial collection cutoff no later than seven calendar
days after departure; decline if that cannot be met. Empty logs do not establish coverage. No license upgrade is assumed or purchased.
Unsupported hidden, dynamic or transitive access paths must be excluded explicitly;
if required to answer the customer's actual question, decline this fixed package.
If mandatory evidence prerequisites fail, do not quietly reduce scope and take payment.

## Check criteria and result rules

| Check | PASS requires | Failure or missing evidence |
|---|---|---|
| Sign-in setting | Correct identity and attributable accountEnabled=false observation at cutoff | Enabled = FAIL; missing/unreadable/wrong identity = INCONCLUSIVE or NOT_TESTED |
| Revocation action | Attributable successful customer-performed revocation evidence for this identity at/after departure and by cutoff | Documented unsuccessful action = FAIL; absent/ambiguous records or attestation only = INCONCLUSIVE; no collection = NOT_TESTED |
| Each named relationship | Complete permitted observation supports removal of that exact static/direct relationship | Still present = FAIL; insufficient permissions/pagination/unsupported type = INCONCLUSIVE or NOT_TESTED |
| Optional sign-in context | Context only, describing accessible log types and window | No events is not proof of no access; contradictory later activity must be reported and investigated |

NOT_APPLICABLE needs a documented reason and reviewer concurrence; it cannot bypass
missing mandatory evidence. If zero relationships are specified, record and acknowledge
that explicitly with a reason; do not imply tenant-wide relationship coverage.
Overall: **Scoped checks supported** only if all required applicable checks pass and
no unresolved contradictory evidence remains; **Exceptions found** if a required
check fails or contradictory evidence remains; otherwise **Insufficient evidence**
if any mandatory check is INCONCLUSIVE/NOT_TESTED. None means universal access removal.

## Deliverables and acceptance

| Deliverable | Objective completion criterion |
|---|---|
| Independently reviewed assessment PDF | Tenant/identity, window, bounded conclusion, every agreed control/result, source references/times, exceptions, limitations, reviewer/version and next actions |
| Evidence register | Retained items, provenance, collection times, evidence IDs/hashes and access/retention limitations; no automatic distribution of raw sensitive exports |
| Remediation worksheet | Each exception has an owner role, suggested action and retest criterion; Proofline performs no configuration changes |
| Debrief | One 30-minute walkthrough offered; questions answered within scope |
| Retest addendum | New evidence/results and remaining exceptions, preserving the original report and findings |

Acceptance depends on complete, traceable, correctly scoped and internally consistent
deliverables, not a favorable finding. Customer reviews within five business days,
identifies specific factual/scope defects, and confirms acceptance explicitly; silence
is not acceptance. One consolidated factual-correction round is included. Valid provider
errors are corrected without added fees. New controls/sources/identities/windows are
scope changes, not factual corrections. FAIL/INCONCLUSIVE is a valid assessment result.

## Schedule and customer responsibilities

Business days: Monday–Friday excluding US federal holidays, America/New_York.
Dates become commitments only in a signed, launch-authorized engagement.
**Ready-to-start** requires signed scope/authorization, release clearance, verified
tenant/identity/relationship IDs, accessible mandatory sources, approved read-only
access, named collector and independent reviewer, customer contact and cleared kickoff
payment. Confirm readiness and the due date in writing. Preflight has no paid clock.

Initial reviewed report: within **five business days** after readiness confirmation.
Debrief slots offered within five business days after delivery. Retest requested within
**ten business days** after initial delivery; customer performs remediation and supplies
new authorized evidence. Retest addendum: within **three business days** after retest
readiness. Retest uses a newly recorded observation time and available change evidence
since the original cutoff; it does not rewrite or extend the original seven-day window.
Missing retained retest evidence remains INCONCLUSIVE. Consolidated factual correction: within two business days after sufficient
correction information. Retest may legitimately conclude FAIL or INCONCLUSIVE.

Customer supplies authority, departure time, IDs/listed relationships, administrator,
access and available records; confirms authority to process employee information;
performs all changes and responds to in-scope questions within two business days.
Use only the approved secure channel once implemented; no passwords/tokens/raw evidence
by ordinary email. Named recipients and actual retention/deletion terms are agreed
under checklist #3 before any customer data is collected.

For blocked customer dependencies, notify and pause the clock in writing. After five
business days without resolution, offer a revised schedule or cancellation. Do not
expand permissions or buy tools unilaterally. Proofline supplies collection, assessment,
separately accountable independent review, reports, meetings, included retest and access
cleanup. Reviewer availability is a launch prerequisite, not a claim of current staffing.

## Price and included assistance

**$1,950 USD service fee**, plus only applicable tax established before signing.
No subscription, auto-renewal, hidden platform fee or automatic hourly overage.
**$975** after signed authorization and successful preflight, immediately before kickoff;
**$975** on secure delivery of the reviewed initial report, due within seven calendar days.
No payment accepted until launch approval; no provider expense authorized by this document.

Includes the meetings, recommendations, one consolidated correction round, one retest
and up to 60 minutes of asynchronous explanation in the retest window. Customer/admin
executes remediation. Configuration work, another identity/tenant, extra relationships,
extra collection/retest rounds, excluded-system investigation and extended support need
a separate written fixed-price quote and authorization. No work or expense is committed
without applicable customer and internal approval; original scope remains deliverable.

## Selected cancellation/refund policy

These are commercial design decisions for contract review under #3, not approved legal
terms or a statement of enforceability. The finalized agreement preserves applicable rights.

| Stage | Fee allocation | Earned milestone |
|---|---:|---|
| Kickoff/collection | $600 | Kickoff and agreed initial collection/evidence register complete |
| Assessment/independent review | $850 | All agreed checks evaluated and exact draft version reviewed |
| Initial report/debrief availability | $300 | Complete reviewed report securely delivered and debrief slots offered |
| Retest availability | $200 | Retest delivered, or ten-business-day request window expires without a timely request |
| Total | **$1,950** | No extra charge without a separate signed quote |

Before kickoff: full refund. Customer cancellation after kickoff: retain only completed,
documented milestones; refund collected money exceeding those fees within ten business
days. If completed milestones exceed payments received, invoice only the shortfall,
due within seven calendar days; no cancellation penalty. Partial milestones are not charged. Cancelling an unused retest before its request
window expires refunds its $200 allocation; this allocation is not a second charge.
Provider cancellation/inability before a complete initial report: full refund.
Provider inability to deliver a timely requested included retest: $200 refund.
Provider-caused missed initial due date: customer chooses revised schedule or cancellation
and full refund before complete initial delivery. Adverse security findings are not
refund triggers when the agreed deliverables are complete and accurate.

## Exclusions and limits of proof

No tenant-wide audit, SOC/CPA attestation, certification, legal opinion, incident response,
penetration test, exploitation, credential use, attempts to sign in as the departed
employee, configuration changes, threat hunting or continuous assurance. First pilot
excludes hybrid/federated identities, guests, service principals, privileged/emergency
accounts, multiple accounts, sovereign/GCC tenants and active suspected compromise.

No mailbox delegation, SharePoint/OneDrive links, Teams content, endpoints/local accounts,
VPN/network access, shared passwords, external SaaS, guest home-tenant access or data-copy
investigation. A directory application assignment does not prove the application's own
account/session ended. No guarantee of immediate/universal session termination, absence
of access/compromise, future security or compliance. Hashes provide integrity references,
not authentication of the truth of a source event.

Microsoft documents revocation delay/external-user limitations and sign-in retention
limits. These inform the scope; they do not claim implemented production collection:
- https://learn.microsoft.com/en-us/graph/api/user-revokesigninsessions?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/signin-list?view=graph-rest-1.0

## Completion record for checklist #1

| Requirement | Definition evidence | State |
|---|---|---|
| First service/target customer | Service/customer section | Defined |
| Bounded outcome | Promise and check criteria | Defined |
| Identity/apps/tenant/window/exclusions | Scope and exclusions | Defined |
| What cannot be proved | Result rules and limits | Defined |
| Deliverables | Acceptance matrix | Defined |
| Timing/customer duties/acceptance | Schedule/acceptance sections | Defined |
| Included remediation/retest versus extra work | Assistance/scope-change policy | Defined |
| Price/payment/cancellation/refunds | Commercial sections | Defined; legal formalization is #3 |
| Cost/profit constraints | offers/PILOT_ECONOMICS.md and .json | Modeled, not actual quotes or validated delivery time |
| Website/proposal/sample consistency | proofline/*.html and offers/PILOT_PROPOSAL_TEMPLATE.md | Repository copy aligned; public deployment not claimed |

Offer definition is complete. Buyer willingness-to-pay, actual reviewer costs, delivery
performance and operating capability remain unvalidated. All other launch gates remain
open; nothing in this specification authorizes a customer sale or paid provisioning.
