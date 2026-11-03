# Operational role separation — November 3, 2026

Deployed a partial unique PostgreSQL index in Proofline's isolated Supabase staging project. For the same tenant, a verified Auth identity can have **at most one active operational role**: collector **or** reviewer. Auditor assignments remain independently possible. The uniqueness check is concurrency-safe for simultaneous inserts, unlike a read-then-check application query.

**Verified live** using a rolled-back temporary-table fixture with the identical unique-index predicate:
- Collector plus active reviewer for same tenant and Auth ID: rejected.
- Inactive reviewer changed to active alongside collector: rejected.
- Auditor role alongside collector: allowed.
- A different reviewer identity: allowed.
- Same user reviewer role for a different tenant: allowed.
- Existing index presence: verified.

The fixture did **not** create fake records in auth.users. A full positive identity-provider test still requires two supported, genuinely authenticated synthetic Auth users and active memberships, which have not been provisioned.

The index does not substitute for verifying actual actor identities on custody records, server-side authorization, session revocation, or a live two-user collector-to-reviewer workflow. Customer evidence intake and payments remain disabled.
