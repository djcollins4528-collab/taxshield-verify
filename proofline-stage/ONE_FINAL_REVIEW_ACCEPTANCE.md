# One final independent review per evidence — staging acceptance

Applied 2026-11-03 to dedicated Supabase project pgknyzwctmfqvlivlgpe.

## Live, rolled-back SQL acceptance
- First independent review of synthetic evidence: ACCEPTED.
- Second review of the same evidence by another reviewer: REJECTED (unique violation).
- Review targeting evidence in a different tenant: REJECTED.
- Collector's self-review: REJECTED.
- Installed unique partial index: CONFIRMED.
- The entire exercise ROLLBACK; zero fixture evidence persisted.

## Backend acceptance
The PostgreSQL adapter recognizes ONLY the exact unique constraint `proofline_one_review_per_evidence` as a duplicate-decision failure. An independent local custody audit now rejects cryptographically valid but conflicting duplicate reviews. Other database exceptions propagate for alerting. Combined local Python regression suite: 76 passed, zero failed.

## Limitations
This does not demonstrate genuine Supabase Auth collector/reviewer sessions, a hosted evidence write, production key custody or external recovery. The protected customer API is still sealed, with zero active customer tenants or billing. Review workflow assumes exactly one FINAL decision per immutable evidence item. A later amendment must generate a NEW evidence event with its own review; never overwrite a prior decision.
