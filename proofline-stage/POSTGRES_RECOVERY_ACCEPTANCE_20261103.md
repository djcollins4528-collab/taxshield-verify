# PostgreSQL recovery integration — acceptance recorded 2026-11-03

**Result: 87 local regression tests passed. Production release: NO-GO.**

The private backend package now includes a PostgreSQL event-snapshot exporter with:
- A read-only consistent REPEATABLE READ transaction;
- Independent HMAC/AES-GCM verification of every archived tenant chain and independent review reference;
- Offline Ed25519 signed archive hash + tenant inventory;
- A trusted external prior-checkpoint anti-rollback floor;
- Create-only archive restore using the existing X25519/AES-GCM offsite encrypted transport.

This closes a key design gap: older backup/recovery routines handled only SQLite files while planned production custody is PostgreSQL.

Read-only SQL confirmed the exporter column list matches the dedicated Proofline Supabase staging schema; the custody table was empty. A real PostgreSQL export and independently controlled cloud offsite recovery have **not** been run. The new tests use synthetic PostgreSQL-shaped event records, not the live database.

The complete private backend package is delivered separately; do not push its private key material or secret-bearing configuration to this public repository. Do not activate intake, live payments or production M365 tenant access.

Next external acceptance gate: two real Supabase Auth test principals, an approved read-only archival identity, independently controlled Ed25519 signer + recovery key custody, and end-to-end PostgreSQL export → offsite storage → isolated restore.