# Proofline live staging baseline recovery acceptance — 2026-11-03

**Result:** PASS for a zero-event live baseline; **production promotion remains BLOCKED**.

## Actual observed source
Dedicated Supabase project `pgknyzwctmfqvlivlgpe`, single SQL statement read-only via connected Supabase management interface at `2026-11-03T16:13:51.424562Z`.

- Registered tenants: 1 (synthetic tenant `bbbbaaaa-1111-4111-8111-000000000001`)
- Custody events: 0
- Checkpoint receipts: 0
- Canonical v1 archive SHA-256: `97f9fa03bfb8dbf4fcea881a3c3ac655518c235f60c8b27b355250dedadc8704`
- Inventory: tenant chain count `0`, tip `GENESIS`.

## Newly repaired boundary
The PostgreSQL archive verifier previously required every tenant to already have custody events. It now supports zero-event tenants but still requires all nonzero previously pinned chain tips in a trusted external anchor. Tests cover empty signed archive/restore, mixed nonempty and empty tenants, empty export rejected against a nonempty trusted history, empty tenant inventory rejected, invalid GENESIS prior anchor rejected.

## Verified isolated recovery rehearsal
- Signed baseline with an ephemeral independent Ed25519 key.
- Verified signature and archive SHA-256.
- Sealed archive and anchor using X25519/AES-GCM for an ephemeral recovery recipient.
- Restored from an isolated **local** create-only directory; byte-level archive comparison succeeded.
- Overwrite and wrong recovery private key rejected.
- Test keys existed in memory only; private keys were **not persisted** into any artifact.
- Full protected-backend regression: **91 passed**.

## Critical limitations
This is a **zero-event** baseline: no existing real evidence was validated cryptographically, and the HMAC key used was fresh synthetic test material. The export came through the connected privileged SQL management interface, not a separate read-only DB principal. No backup was sent to a geographically or administratively independent cloud provider, no independent durable signer/custodian was established, and no restore into isolated PostgreSQL took place. There is no externally pinned previous snapshot, so malicious pre-baseline truncation is not ruled out. The two real Auth-user positive acceptance gate is still blocked.

**Customer intake and payments remain disabled.**
