# Proofline staging: nonempty offsite custody recovery acceptance

Date: 2026-11-03. **Staging PASS. Production NO-GO.**

The existing synthetic tenant `bbbbaaaa-1111-4111-8111-000000000001` now has two **persisted** encrypted synthetic events in Supabase project `pgknyzwctmfqvlivlgpe`: one evidence event and a distinct reviewer decision targeting it. They were inserted using authorized privileged SQL for TEST ONLY. This is **not** proof of real Auth-user authorization or runtime least privilege.

Read-only SQL retrieved both persisted records. Base64 envelope fields, UUIDs, timestamps, digest links, and review target were compared with the original fixture; PostgreSQL timestamps were normalized to canonical UTC ISO form. Archive verification decrypted both AES-256-GCM events and checked their HMAC chain using the test-only custody key.

A newly generated independent Ed25519 key signed the verified nonempty archive. X25519/HKDF/AES-GCM sealed the archive+signature for a separate test recovery key. Only the encrypted blob and verification manifest were uploaded to a separate Google Drive folder, not the private keys. Google Drive readback yielded the *same bytes*; local isolated create-only restore then independently verified signature, encryption, two-event chain and reviewed evidence reference. Wrong recovery key and overwrite attempts failed, and the old zero-event baseline was rejected using the new trusted nonempty inventory as an anti-rollback floor.

**PINNED ANCHOR (separate provider: GitHub)**:
- Plain canonical archive SHA-256: `f9a23bbea2e9a1dd2f9a898d27ba064b1a04718630673392f06baee7fd92f8fc`
- Encrypted cloud object SHA-256: `0a78d5b0503fd72b40c002d905293d1df92c83f48ca378b44d4ab0b83a2c3e81`
- Latest synthetic chain: count=2, tip=`d23c678eb918133589feeb1e1e0dd4e68630a8ae746920ce68379f705118a94c`
- Google Drive object ID `1PS_n5UjNTvyIUpQhQSg5FQQsIpFrjxyo`
- Google Drive manifest ID `1Bqd9Jx8IRydyAR-tadYbZ37TebjIOhj1`
- Drive access reported `shared=false`, owner-only.

**Remaining critical gates:** genuine positive Supabase Auth collector/reviewer sessions and revocation, a dedicated restricted exporter login, independent durable signing/recovery key custody, a retention-protected backup provider (Drive is not WORM), and actual isolated PostgreSQL restore. GitHub history is not WORM either and must not be used as the sole tamper-resistant anchor. No new payments or customer intake were activated.
