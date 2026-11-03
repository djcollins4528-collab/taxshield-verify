# Immutable custody acceptance — November 3, 2026

Applied to isolated Proofline staging database `pgknyzwctmfqvlivlgpe`.

Two additional PostgreSQL triggers prevent UPDATE and DELETE (row-level) and TRUNCATE (statement-level) on the custody event history. Runtime roles continue to have no mutation permissions.

Verified live via one rolled-back synthetic transaction: INSERT accepted, UPDATE rejected with SQLSTATE 23514, DELETE rejected with 23514, TRUNCATE rejected with 23514, original row remained intact, both new triggers enabled. Existing append and independent-review guards were retained.

Full protected-backend local test suite: **76 passed**. This does not establish a real Auth collector/reviewer workflow or live protected API database writes.

**Critical boundary:** A highly privileged database administrator can disable triggers or alter schema; this is not WORM. Independent external immutable backup/key custody, signed checkpoint, and restore acceptance remain required before production.

Customer intake, billing and live Microsoft 365 tenant access remain disabled.
