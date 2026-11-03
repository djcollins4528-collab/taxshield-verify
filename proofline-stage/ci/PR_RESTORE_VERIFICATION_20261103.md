# Isolated PostgreSQL recovery PR verification

This draft PR intentionally changes only the recovery CI acceptance directory. It triggers the existing synthetic-only GitHub Actions workflow on the pull_request event so the connected GitHub tools can inspect its status and logs. It is **not** a production deployment or proof of customer-facing recovery.

Acceptance is a green `Proofline isolated PostgreSQL recovery / restore` check including pinned Ed25519 signature, fixture integrity tests, PostgreSQL 17 restore, duplicate rejection and exact 2-event/1-review readback. Do not merge until its execution is confirmed.
