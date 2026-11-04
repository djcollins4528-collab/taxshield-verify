# Synthetic remediation and reverification ledger — 2026-11-04

Staging migration `20261104200937_proofline_synthetic_finding_followups_v1`
adds an internal, append-only finding history. Existing reports and review decisions
are unchanged. No browser/API access or customer delivery permission was added.

Each event pins the original report digest, existing finding, tenant and immutable
changes_requested decision. The first event must be remediation by a confirmed,
active collector with a live session. Reverification requires a confirmed, active
reviewer with a live session and a different identity from the remediation actor.
The prior event must match the same finding/report/review and preceding sequence.
Unique sequence/predecessor constraints reject duplicate appends and branching;
the parent artifact is locked while appending. Attempts alternate remediation and
reverification, so an inconclusive retest can be followed by another attempt without
rewriting history. Remediation itself has no result; reviewer outcomes are PASS,
FAIL, INCONCLUSIVE, NOT_TESTED or NOT_APPLICABLE. None authorizes customer delivery.

Evidence requires typed synthetic classification, customer_data=false, observation,
criterion and limitations. Evidence is size-bounded and its SHA-256 is computed by
the server over PostgreSQL jsonb text. This digest is not a signature, external
source attestation, proof the observation is true, or independent key custody.
Administrative users remain trusted and can disable guards; a future API must
derive actor/session from verified Auth, never accept caller-supplied identity.

Validation: 21 new isolated SQL assertions plus 21 existing security assertions pass.
The new suite exercises remediation → INCONCLUSIVE → new remediation → PASS while
retaining the original draft and decision, and rejects wrong roles, cross-tenant or
cross-finding predecessors, missing/null evidence, sequence gaps, invalid outcomes,
duplicate retests, revoked memberships/sessions and UPDATE/DELETE/TRUNCATE.
Four migration-inventory tests and ten release-gate regression tests pass.

The 38 recorded migrations rebuild in network-isolated PostgreSQL 17 (36 applied;
two pg_net operations excluded). All seven captured live catalog categories match.
These tests use fabricated local Auth table contracts, not genuine Auth acceptance
of the new ledger. No fabricated users or sessions were inserted into hosted Auth.

Post-deployment read-only checks: 16/16 private tables have RLS; followup table has
zero client grants and zero rows; the original report still has one review decision.
The table intentionally has no policies. Security Advisor reports 13 informational
no-policy notices and one Auth warning: leaked-password protection is disabled.
See [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
No plan upgrade or protection change was performed by this migration.

Remaining work: authenticated staging API and browser submission/review history,
genuine session acceptance for followups, verified external evidence and independent
reviewer acceptance, then synthetic handoff and sandbox billing reconciliation.
Customer intake, live billing, delivery and all broad production gates remain blocked.

Post-deployment existing-workflow regression: 24 live Chromium/WebKit API/browser
checks passed at 20:11 UTC. Report access, immutable decision, role denial and
revocation behavior remain intact. This does not claim live followup API acceptance.
