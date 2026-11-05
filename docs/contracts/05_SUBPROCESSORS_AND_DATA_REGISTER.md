# Provider and data-flow register

DRAFT v0.1 | November 5, 2026 | No production processors approved

## Current facts and proposed roles

| Provider / function | Observed state | Permitted data now | Production approval needed |
|---|---|---|---|
| Customer Microsoft 365 / Graph | Intended customer-controlled source; current customer access unverified | No new customer collection authorized | Tenant authority, exact scopes, records and customer's provider relationship |
| Supabase | Existing proofline-assurance-staging, US East, synthetic workbench/Auth/report data | Approved staging fixtures only | Actual production project/region, legal provider, DPA, support countries, backup/log deletion, keys and isolation |
| Vercel | Existing Proofline staging reviewer workbench; public assets | Static code, synthetic auth/workbench traffic; provider access logs may include IP/device data | Production access path, logging/geography/retention, provider terms and downstream recipients |
| Render | Existing public static prelaunch publication; sealed staging gateway also exists | Public copy and necessary web request metadata; no customer evidence | Any future backend role must be separately approved; static hosting is not a vault |
| GitHub | Source and change history | Source, redacted/synthetic fixtures only | No raw customer evidence or secrets; actual access controls, CI logs, terms and retention |
| Independent reviewer | No separately accountable reviewer engagement verified | No customer data | Named person/organization, work country, confidentiality/DPA, access and deletion agreement |
| Offsite vault / key custodian | Production provider and custody not verified | None | Actual provider, region/support, key separation, restore, lifecycle and signed terms |
| Payment processor | Stripe contemplated; no current Proofline sandbox/live acceptance proved | No new customer charges | Dedicated merchant/legal identity, role/terms, payment metadata and accounting retention; no assessment evidence |
| Email / notices / e-signature | Replacement Proofline channel/provider not verified | No new customer intake | Actual mailbox/contact, MFA, metadata/retention and signed-document storage; no ordinary-email raw evidence |
| AI / analytics / advertising | No evidence-processing role approved | No customer evidence | Disabled for this pilot; any later use requires separate review and authorization |

These are trade names for an inventory, not verified legal counterparty names or an
approved production subprocessor list. Some vendors may act as separate controllers
for their own necessary service records; record actual role/contract rather than
labeling every provider a processor. Do not infer US-only processing from US East.
No affiliation, certification or provider endorsement is implied.

## Per-engagement approval record

For each approved recipient record legal entity; service purpose; controller/processor
role; precise data categories; ingestion/egress path; tenant/project reference; primary
and backup region; support countries; logging; encrypted transfer/storage/key custody;
access roles; DPA/terms version; downstream processor information; primary deletion and
backup expiry; incident contact/SLA; evidence URL/date; customer approval and change notice.

Record separately: source originals retained by Customer; minimized live evidence;
reviewer working copy; final report/delivery links; backups; application/security logs;
contracts/invoices; browser caches/downloads on approved operator devices. A hash is
potentially linkable metadata, not automatically anonymous data. Redact identifiers
from tickets and source repositories. Capture all copies in closeout/deletion checks.

Production processing remains blocked until every actual path has a verified owner,
location, lifecycle and accepted terms. A blank provider table cannot be signed as
an affirmative statement that unspecified vendors are authorized.
