# Verified offsite encrypted baseline round trip — 2026-11-03

**Staging backup PASS / Production NO-GO.**

- Source: Supabase project `pgknyzwctmfqvlivlgpe`, synthetic tenant only, 0 custody events, 0 checkpoint receipts (verified by read-only SQL).
- Signed canonical archive SHA-256: `97f9fa03bfb8dbf4fcea881a3c3ac655518c235f60c8b27b355250dedadc8704`.
- Encrypted archive SHA-256: `bea3d81d4fac1cad759dab3e39abcef33e2d6f11242314b6382686d8e27a1d42`.
- External destination: separate user-owned Google Drive folder `Proofline Assurance - Encrypted Staging Backups`, folder ID `1N2JtkZStp-kr8aphfDmiV8Y88PAm4O1H`.
- Stored encrypted object ID: `1OtXRwW9UDPX1C6LLKMIRmVJLLUlxCyRO`. Verification manifest ID: `17b0j4mr3ih413qZ0JpO_PFTVkYerwmR5`.
- Readback: both files owned by the user, `shared=false`, no public permissions reported.
- Materialized the encrypted file back from Google Drive; bytes and SHA-256 match the uploaded object.
- Independently decrypted using test-only recovery key not uploaded to Drive; Ed25519 signature verified; restored canonical archive to isolated local create-only destination.
- Test-only key material is NOT in the public repository or Google Drive.
- **Limitations**: single empty baseline, no genuine Auth principals, no nonempty production key/HMAC evidence, no isolated PostgreSQL database restore, no object-lock/WORM or administrative separation, no durable recovery key custody.
- Customer intake and billing remain disabled. No paid resources commissioned.

Next verified step: nonempty synthetic export using dedicated least-privileged read-only PostgreSQL principal, independent retention-protected storage and externally pinned anchor, isolated PostgreSQL restoration, then genuine two-user Auth acceptance.
