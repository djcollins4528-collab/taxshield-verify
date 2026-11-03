# Proofline stage connection / next activation gate

Current state:
- Isolated staging database: pgknyzwctmfqvlivlgpe, us-east-1.
- proofline_stage_login: **NOLOGIN**, inherited restricted runtime permissions.
- Synthetic-only test tenant: bbbbaaaa-1111-4111-8111-000000000001.
- Event audit guard rejects skipped sequences, invalid previous digest, and wrong role/kind.
- Render staging service remains sealed; no secret database connection exists.
- Customer intake and billing disabled.

## Pooler discovery requirement
Supabase direct db host is IPv6-only on the Free tier; Render has no outbound IPv6. Do not use it from Render. Supabase session pooler is IPv4, port 5432. The exact hostname CANNOT be determined from region; obtain it from the project dashboard **Connect > Session pooler**. A synthetic example hostname is NOT a real endpoint.

## Secure activation (not completed)
1. Retrieve actual session pooler hostname directly from Supabase's authenticated Connect dialog.
2. Provision a cryptographically secure random password for proofline_stage_login and enable LOGIN, without showing the password in any report or source file.
3. Set Render **secret** PROOFLINE_POSTGRES_DSN (project-scoped pooler username, sslmode=verify-full, sslrootcert=system) and PROOFLINE_POOLER_HOST.
4. Use a Render build with pinned reviewed psycopg package, start via proofline-stage/start.sh and PROOFLINE_STAGE_MODE=sealed_db_probe. This is a NEW restricted diagnostic service, not customer API.
5. Confirm real TLS verified connection, exact role, privileges, synthetic insert then ROLLBACK; inspect Supabase row count remains zero.
6. Keep API routes closed, then validate external OIDC issuer, real reviewer separation, and independent recovery.

No hidden default credentials, no downgrade to sslmode=require, no self-approval, and no active customer tenants.
