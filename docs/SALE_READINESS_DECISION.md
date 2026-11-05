# Proofline sale-readiness decision — 2026-11-04 (America/New_York)

Decision: **NO-GO for accepting paying customer engagements through this build.**
An internal synthetic demonstration is supportable. A paid pilot and self-service
production offering are not yet supported by the verified delivery capability.
This is an engineering/operational assessment, not a legal determination.

## Evidence boundary

The inspected system is PR #12 in `djcollins4528-collab/taxshield-verify`, existing
Supabase project `pgknyzwctmfqvlivlgpe`, and Vercel project
`proofline-assurance-staging`. It is not a deployed customer production system.
The current workbench and APIs explicitly pin a synthetic artifact/tenant and
keep reports as drafts. A production tenant onboarding and approved customer
delivery path is not established here. The separately packaged custody engine
was not available for this inspection and cannot be counted as production-ready.

Current code adds role-aware remediation/retest forms and paginated immutable
history. The server supplies the active role and eligible change-request ID;
the browser does not choose an identity or role for authorization. It permits
only the next role's action and requires a fresh read after conflict, timeout or
uncertain append outcome. Automated browser acceptance/deployment evidence is
recorded separately in FOLLOWUP_WORKBENCH_ACCEPTANCE.md.

Current live database checks: 16/16 private tables have RLS, zero client private-table
grants, two confirmed role users, zero sessions and zero followup rows; existing
reports remain locked drafts. Prior genuine owner-account sign-in/report/review
tests passed. No genuine followup writes or retests were performed in this cycle:
the approved live acceptance configuration is not present in this runtime.
Passwords previously kept in encrypted operator storage were not retrieved,
changed or exposed. No users/sessions/acceptance markers were fabricated.

## Can we sell it today?

| Capability | Verified position | Consequence for a sale |
|---|---|---|
| Internal demonstration | Synthetic review and followup UI; automated contracts and regression evidence | Suitable for an accurately described demo; disclose synthetic scope |
| Real customer onboarding | Pinned synthetic tenant; customer intake disabled | Cannot promise a customer can onboard through this build |
| Source collection and assessment | Current authorized development-tenant/least-privilege Graph acceptance absent | Cannot claim a complete current Microsoft 365 assessment has been proved |
| Independent review | Separate owner-controlled Auth accounts and role controls tested | Does not establish an independently accountable human reviewer |
| Approved customer report and delivery | Immutable synthetic draft; approval and delivery disabled | Core paid deliverable cannot yet be produced/delivered through this system |
| Remediation/reverification | Database contracts and API implemented; role-aware UI added | Genuine end-to-end followup acceptance still required |
| Custody and recovery | Isolated schema/data recovery subsets tested; independent production key/storage custody unverified | Cannot promise production evidence custody/recovery on current evidence |
| Commercial operations | Offer v1.0 defined in PILOT_DELIVERY_BRIEF.md; contracting/data terms, operator/support and applicable business prerequisites remain unverified | Commercial activation remains blocked; this record makes no finding about current legal status |
| Billing | Live payments disabled; merchant sandbox reconciliation not established | No verified purchase/failure/refund-to-delivery workflow |
| Demand and pricing | $1,950 one-time pilot price selected with modeled economics; former review/subscription hypotheses superseded | No validated willingness-to-pay or revenue forecast follows from engineering tests |

The database's 6/9 preflight is **not 67% launch readiness**. Two absent live
sessions are appropriate after cleanup; keeping sessions open would not complete
commercial acceptance. All nine broader A–I production gates remain blocked.
That is a count of incomplete acceptance gates, not a percentage of code completed.

## Shortest defensible path to a first paid pilot

1. **Finish genuine role workflow acceptance.** Run confirmed collector remediation
   → reviewer INCONCLUSIVE → another remediation → reviewer PASS through the UI/API.
   Test revoked sessions, wrong roles, duplicates and cross-finding references;
   independently check stored hashes/history and retained draft/delivery locks.
   Close sessions afterward. This is still a synthetic staging milestone.
2. **Prove the deliverable.** Obtain authorized development-tenant access and verify
   the least-privilege collection flow. Implement/verify the real-tenant and approved
   report/delivery path, with a named independent reviewer for any independent-review
   claim. Complete one bounded engagement rehearsal from authorized source collection
   through assessment, review, simulated customer delivery, remediation and retest.
   Verify production-equivalent data/key custody and restore before customer data.
3. **Make the engagement operable.** Use the defined first-pilot scope/exclusions in PILOT_DELIVERY_BRIEF.md; finalize
   evidence/retention/deletion terms, accountable operator, support/incident process
   and acceptance criteria. Verify the intended contracting identity and applicable
   business/contracting prerequisites. Existing historical approvals are not treated
   as current completed prerequisites without their evidence. Do not expand the
   initial sale into recurring continuous assurance before it can be delivered.
4. **Verify purchase and authorize launch.** Complete the intended billing sandbox
   and reconciliation, including failures, duplicate events and refunds; run a full
   inquiry-to-delivery rehearsal. Obtain explicit activation approvals for intake,
   customer data and live payments only after the evidence supports them. Start with
   one narrowly scoped paid design partner, then measure delivery acceptance, costs
   and actual revenue before scaling.

No reliable launch date or completion percentage can be defended from the current
evidence. Independent reviewer availability, source authorization, custody setup and
commercial decisions are dependencies, not just additional coding tasks. A scoped
operator-led pilot is a nearer target than a public self-service subscription,
but neither is ready for payment activation today. Marketing can truthfully discuss
the problem and demonstrate synthetic capabilities without claiming readiness or
accepting a paid engagement this system cannot yet fulfill.
