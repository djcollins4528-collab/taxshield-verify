# Recorded Proofline staging migrations

Recovered from `supabase_migrations.schema_migrations` on 2026-11-04 for project
`pgknyzwctmfqvlivlgpe`. Versions and names are the database's recorded identifiers.
These are historical statements, not instructions to rerun against existing staging.
Earlier excerpts in the parent directory are retained for existing tests; do not
apply both histories to a new database.

`manifest.json` pins each file's SHA-256 after CRLF-to-LF normalization. The replay
runner fails before execution on missing, additional or modified migration files.

Run from repository root:
`python proofline-stage/ci/replay_recorded_migrations.py`

The runner creates a uniquely named Docker PostgreSQL 17 container from a pinned
image digest, with no network, published port or persistent volume. It removes only
its own container afterward. Docker must already be running. No hosted credentials
are accepted. Auth users/sessions are minimal synthetic table contracts, not Auth.

36 of 38 recorded migrations replay. The two pg_net installation/relocation steps
are explicitly excluded because stock PostgreSQL lacks that Supabase extension.
Dispatcher functions are never invoked locally. This does not validate network
dispatch, Supabase Auth, data restoration, encryption keys or independent recovery.

The resulting application catalog matches the checked-in live inventory for tables,
columns, constraints, triggers, policies, function definitions/settings and table
grants. Function-definition comparisons normalize line endings. The inventory is an
observed snapshot, not a continuously refreshed claim. Auth schema, global roles,
extension implementation, function/sequence ACLs and indexes need separate validation.

21 SQL assertions cover valid/invalid report contracts, mutation/truncation denial,
client table privileges, RLS and fail-closed release. Four Python tests verify the
migration inventory rejects tampering, missing files and unexpected files.

21 additional assertions cover the synthetic finding followup ledger and its retained
remediation/reverification history. Candidate migrations can be tested locally with
`--candidate path/to/migration.sql` after checking the baseline live catalog; this
option never applies anything to hosted staging. Recorded migrations remain checksum
verified. No candidate flag is used in the committed hosted rebuild CI.

New migration `20261104142004` adds five statement-level TRUNCATE guards and a strict
complete-report constraint. It changes no rows or access grants. An administrator
capable of disabling triggers/constraints remains inside the same trust boundary;
these guards do not establish independent cryptographic custody.
