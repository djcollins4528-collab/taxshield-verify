# PostgreSQL table restore rehearsal — verified 2026-11-03

**Staging milestone: PASSED. Production promotion: NO-GO.**

Recovered the actual encrypted synthetic nonempty custody backup downloaded from Google Drive, verified SHA-256 `0a78d5b0503fd72b40c002d905293d1df92c83f48ca378b44d4ab0b83a2c3e81`, decrypted it with separate test-only X25519 key, independently verified Ed25519 signer plus AES-GCM/HMAC chain. Canonical archive SHA-256 matched `f9a23bbea2e9a1dd2f9a898d27ba064b1a04718630673392f06baee7fd92f8fc`.

Ran a rollback-only SQL restore against the actual Supabase staging PostgreSQL engine: recovered two synthetic events into a session-local temporary table, performed bidirectional all-field comparison with source `proofline_private.custody_events`, verified the independent review reference and reviewer separation, deliberately tampered with temporary actor metadata and confirmed the check detected it, then ROLLBACK.

Afterward verified original state: **1 synthetic tenant, 2 encrypted events, 1 reviewer event, 0 Auth users, 0 memberships, 0 checkpoint receipts, 3 active custody triggers**. New synthetic-only restore-generator code and 4 additional tests passed; **95 Python regression tests passed in total**.

**Important distinction:** This tests real PostgreSQL *table* restoration, **not an independent PostgreSQL server/region/provider restore**. It is NOT complete production disaster recovery. Original synthetic events were written via privileged management interface, not genuine Auth principals. Backup is not WORM, signing keys are test-only, and independently controlled key escrow is pending.

No public/customer evidence API or billing activated. The downloadable milestone bundle contains code, generated rollback-only SQL for the synthetic fixture, manifest, and acceptance report **without private recovery keys**. Next: test two genuinely authenticated actor sessions, provision separate restricted exporter and isolated PostgreSQL target, independently controlled key custody and retention-protected storage.
