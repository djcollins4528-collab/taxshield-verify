# Signed provenance gate for isolated PostgreSQL restore — November 3, 2026

**Implementation committed. Offline Ed25519 cryptographic verification: PASS. Hosted PostgreSQL 17 run: NOT independently verified. Production: NO-GO.**

## What changed

- Private test-only recovery key was used LOCALLY to decrypt the previously saved Google Drive synthetic backup and extract its actual Ed25519 signed checkpoint. The private key was not included in any GitHub file.
- `proofline-stage/ci/signed-synthetic-anchor.json` records that authentic signed checkpoint.
- `proofline-stage/ci/public-pinned-signer.json` pins the public Ed25519 verifier, canonical archive hash and encrypted backup hash.
- `proofline-stage/ci/run_isolated_restore.py` verifies the Ed25519 signature on canonical checkpoint bytes, signed `snapshot_sha256`, exact tenant+two-event inventory and pinned public key before generating any PostgreSQL restoration SQL.
- `proofline-stage/ci/test_isolated_restore.py` adds positive signed checkpoint and negative forged-signature/wrong-signer test cases.
- `.github/workflows/proofline-postgres-restore.yml` installs cryptography and runs all tests before restoring to its disposable PG17 service.

## Verified cryptographic facts

- Archive SHA-256: `f9a23bbea2e9a1dd2f9a898d27ba064b1a04718630673392f06baee7fd92f8fc`.
- Encrypted Google Drive object SHA-256: `0a78d5b0503fd72b40c002d905293d1df92c83f48ca378b44d4ab0b83a2c3e81`.
- Pinned signing public key: `120ece3f52387b5b451dde52da4af175081b691fbf20fe65d7b4065a4f1f1827`.
- Signed inventory: synthetic tenant `bbbbaaaa-1111-4111-8111-000000000001`, count 2, last digest `d23c678eb918133589feeb1e1e0dd4e68630a8ae746920ce68379f705118a94c`.
- Local cryptographic rehearsal: authentic anchor accepted; forged signature, wrong signer and tampered inventory all rejected.

## Operational boundaries

The check authenticates the **synthetic** fixture's provenance; it does not verify current customer data, nor does it validate the private HMAC/AES-GCM custody chain within GitHub Actions (custody key remains outside the public repo). It does not establish an independent durable key custodian, WORM backup, real-user Auth authorization, or verified green hosted PostgreSQL run.

GitHub Actions status could not be confirmed via available access; a status response with no checks must not be represented as a green workflow. Customer intake, billing and public evidence API remain OFF.
