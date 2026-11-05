# Data processing and security addendum

DRAFT v0.1 / NOT EXECUTABLE | November 5, 2026

These are proposed contractual obligations, not claims about current staging. Complete
the production data/recipient schedule and prove the controls before signature or data.

## 1. Roles, instructions, purpose and duration

Customer determines the authorized offboarding-review purpose and legal basis; Supplier
processes scoped employee/admin data on Customer's documented instructions to collect,
assess, independently review, securely deliver and retest the specified controls.
Supplier separately administers its own necessary contract/billing records. Role and
applicable-law determinations depend on the actual transaction; this addendum does not
claim every privacy statute applies. In particular, Virginia's CDPA consumer definition
excludes employment/commercial contexts; that does not remove other privacy, security,
contractual or breach obligations. No EU/UK transfer mechanism or regulated-data agreement
is supplied; any actual need requires separate review before acceptance.

Processing lasts only through the SOW plus the specified return/retention period.
Instructions consist of the signed SOW, authorization, this addendum and approved written
changes. Notify Customer if an instruction appears unlawful and pause that instruction.
If law requires other processing, notify beforehand unless prohibited. No sale, targeted
advertising, model training, unrelated profiling, employee scoring or reuse for another
customer is authorized. Do not use findings to make automated employment decisions.

## 2. Data categories and minimization

Data subjects: the one departed member and administrators whose identifiers appear in
necessary audit records; named authorized customer/MSP contacts and report recipients.
Possible fields: tenant/user/object identifiers, UPN/name when necessary, departure
metadata, accountEnabled, named group/app relationships, audit actor/action/status/time,
source references and hashes, scoped findings and remediation/retest records. Optional
sign-in context may contain IP/device/location metadata; collect only if specifically
needed, authorized and available, and limit to the named identity and time window.
Do not infer physical location or misconduct from those fields.

No passwords, session tokens as evidence, SSNs, card numbers, mailbox/file content,
health data, government/classified information or unrelated personnel records are
requested. Access secrets remain in approved secret storage/memory as technically
necessary; never place them in logs, reports, Git, email or the evidence register.
Unexpected sensitive/out-of-scope material: stop unnecessary processing, restrict access,
notify Customer, arrange lawful return/deletion and record the disposition without
reproducing the material. A scope change is required before any justified expanded use.

## 3. Mandatory security schedule — implementation evidence required

Before collection, document and test: encrypted transport and encrypted storage;
managed key custody/access/rotation and protected recovery; MFA for privileged/provider
accounts; distinct named collector/reviewer identities; least privilege; per-customer
isolation and authorization on every protected resource; session expiry/revocation;
restricted evidence transfer with verified recipients; integrity/version checking;
monitored security/audit records without tokens or unnecessary personal data; patching,
secure operator devices and incident contacts; recovery and deletion tests covering all
replicas/providers. Do not equate hashing with source authenticity or RLS configuration
with a full independent security assessment. No certification is asserted.

Only the named collector, separately accountable reviewer and strictly necessary approved
support/security personnel may access customer evidence. Each person has written
confidentiality, data handling and incident duties; access is logged and removed when
no longer needed. Supplier remains accountable for approved subcontractors. Remote
work location and any cross-border support access must be disclosed in the completed
schedule. US database region alone does not guarantee all processing stays in the US.

No customer evidence in consumer chat/AI services, public repositories, staging fixtures,
public static websites or ordinary email. No production customer data in the current
synthetic staging tenant. A customer-approved secure portal/channel and actual production
access/delivery path are prerequisites; this document does not supply them.

## 4. Providers, location and changes

The signed register must identify each provider's legal identity, function, data types,
storage/processing region, support-access locations, retention/deletion, confidentiality,
security terms, applicable DPA and onward recipients. Categories alone are not approval.
Customer explicitly approves that fixed register before data; unverified entries block
processing. Supplier imposes equivalent applicable duties by written agreement and
remains responsible for its subcontracted performance.

Give 15 calendar days' advance written notice of a proposed new/materially changed
subprocessor or processing country, with sufficient information to object on reasonable
data-protection grounds. Do not send affected data pending resolution/approval. Seek
an alternative; if none is workable, Customer may terminate affected unperformed scope
without penalty under the agreement's earned-fee/refund rules. Security-driven urgent
changes must first isolate/stop affected processing; urgency is not blanket consent to
undisclosed providers. A provider's emergency security measures remain subject to law.

## 5. Requests, assurance and incidents

Route data-subject or regulator requests promptly to Customer, normally within two
business days; do not disclose employee data merely because a requester knows a UPN.
Verify authority with proportionate checks. Provide reasonable assistance with lawful
access, correction, deletion, assessments and incident duties. Do not respond on
Customer's behalf unless instructed or legally required. No representation of a fixed
statutory response period is made for all jurisdictions.

On awareness of unauthorized access, loss, disclosure, alteration or destruction of
Customer data, notify Customer without unreasonable delay and in any event within
24 elapsed hours, sooner if applicable law requires. This contractual target is broader
than some statutory breach definitions; do not wait for a complete investigation or
proof of financial harm. A staffing/escalation drill and verified primary/alternate
contacts must support it before signature. It is not a claim of 24/7 managed detection.

Provide then-known nature/time, affected data/systems, containment, likely effects,
contact and next steps; update at least daily while materially active, then as agreed.
Secure evidence and mitigate/cooperate without publishing confidential incident details.
Customer coordinates its individual/regulator notices unless law directly requires
Supplier to notify; this clause does not delay Supplier's own legal duties. Statutory
analysis includes actual affected jurisdictions, data and roles; do not treat every
security event as a notifiable Virginia breach or apply a universal 72-hour rule.

Provide reasonable information to demonstrate these duties. Cooperate with a proportionate
customer/designated-assessor review on reasonable notice, once annually plus following
an incident or material concern. Protect other customers and secrets through redaction,
controlled access and confidentiality; no live exploitation is authorized. A genuinely
qualified independent assessment may be supplied as an agreed alternative, not fabricated
from automated tests. Each party bears its own ordinary cooperation costs unless a signed
scope amendment covers unusual work; legally required assistance is not withheld for fees.

## 6. Retention, return, revocation and deletion

Closure means the later of initial-report delivery and included retest completion or
expiry of its ten-business-day request window; earlier cancellation/termination closes
the engagement on that date. Record the actual closure event and calendar date.

Default draft schedule: keep minimized evidence, reports and working records for 90
calendar days after closure for corrections/disputes; then complete primary/live-copy
deletion within 30 calendar days. On a lawful earlier Customer return/deletion instruction,
start that 30-day deletion period on receipt instead. Make an authorized usable secure
export available within ten business days of a return request and before scheduled
deletion, unless legally prohibited. Include reports/evidence register and approved
customer-owned scoped evidence; do not disclose unrelated data or Supplier secrets.
Agree any necessary format/redaction explicitly. No extra export fee is assumed.

Backups must be isolated from ordinary use and expire within 35 calendar days after
primary deletion. Restoration must reapply prior deletion instructions before restored
data is made operational. Default maximum without a legal hold is therefore 155 calendar
days after closure (90 + 30 + 35); do not describe backup deletion as immediate. No new
customer evidence may enter a backup system whose actual cycle cannot meet the agreed
limit. Immutable/WORM storage and provider logs must be checked for conflicting retention;
if incompatible, change the approved architecture/terms before collection, not afterward.

Revoke Supplier-side sessions, queued jobs and temporary access promptly on termination,
revocation or expiry, targeting the same business day; customer-admin-dependent grants
are tracked until the admin supplies evidence. Customer controls its original tenant
records; Supplier does not promise to delete Customer's own Microsoft audit history.
Removing a grant does not erase evidence already lawfully retained under this schedule.

Minimal contracts/invoices/tax records may be retained separately for a proposed seven
years after the relevant year end, subject to accountant/counsel confirmation and
applicable mandatory periods; exclude raw employee evidence and secrets. Necessary
security logs follow a documented minimized schedule in the signed register. Do not
quietly extend evidence retention by relabeling every export as an audit log.

For a legally required hold, isolate only necessary data, restrict use, document legal
basis and review dates, notify Customer unless prohibited, and delete promptly when the
hold ends. Record primary deletion and eventual backup expiry separately, with operator,
systems/providers covered, dates, unresolved residuals and reviewer confirmation. Supply
a truthful completion record; do not certify full deletion while backups/holds remain.

## 7. Execution and precedence

The completed provider/data schedule and SOW are integral. Customer may choose return
and deletion; no indefinite retention or third-party disclosure is implied by signing.
The addendum controls privacy conflicts. MSA liability clauses apply only to the extent
lawful and cannot remove obligations imposed directly by law. Signatures/reference to
fixed signed MSA/SOW: UNSIGNED. Production security/deletion/location approval: UNVERIFIED.
