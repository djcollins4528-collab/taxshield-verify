# TaxShield Verify — Assessment delivery playbook v1.0 (prelaunch)

## Scope gate
Capture legal customer identity, authorized signatory, named domains/hostnames/tenant, service package, explicit read-only authorization, exclusion list, agreed date, data handling terms. Reject requests containing tax returns, passwords or client confidential data.

## Ordered workflow
1. Validate signed scope and methods against asset allowlist.
2. Collect evidence with UTC timestamp, asset, source/method, observed value, reproducibility notes and limitations.
3. Normalize to evidence classification: OBSERVED / CUSTOMER_ATTESTED / NOT_VERIFIED / NOT_APPLICABLE.
4. Evaluate checks without equating missing evidence to a failed control.
5. Develop findings: identifier, affected asset, observation, evidence IDs, confidence, risk rationale, priority, owner, action, recheck criterion.
6. Manually QA factual accuracy and customer context; remove unsupported assumptions.
7. Compile executive summary, scope, limitations, evidence register, findings, action register and export.
8. Customer walkthrough; record corrections and acceptance.
9. Apply documented retention/deletion policy; never store raw credentials or taxpayer documents.

## Package boundaries
External Snapshot $299 proposed: up to 2 email domains and 2 HTTPS hosts; SPF, DMARC, observable DKIM only, TLS/headers, findings, 30-min handoff. No scanning/exploitation or tenant access.
Microsoft 365 Review $499 proposed: includes external package, authorized bounded Graph configuration evidence, roles, MFA/Conditional Access where verifiable, 45-min handoff. Permissions and customer licensing govern coverage.
Quarterly Watch $99/month proposed after baseline: quarterly scoped recheck, difference summary, refreshed actions, email summary, 20-min review. No 24/7 monitoring or emergency response.

## Report sections
1 Executive decision brief; 2 Signed scope and exclusions; 3 Methods and evidence register; 4 Findings; 5 Not-verified controls; 6 Prioritized action register; 7 Questions and limitations; 8 Delivery and acceptance.

## Operational acceptance gates (not yet passed)
- Legal business and scope authority, contracts, insurance, approved secure delivery and tenant isolation.
- Automated collectors independently validated against approved test fixtures.
- Reporting reproducible with stable evidence IDs and timestamps.
- Billing identity and payments only after production acceptance.
