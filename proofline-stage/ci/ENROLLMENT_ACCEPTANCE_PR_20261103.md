# Auth test-user enrollment CI acceptance

Verifies that the live staging schema's one-role-per-Auth-user constraint and one-time, confirmed-user enrollment script reject duplicate roles, non-test addresses, missing parameters and repeated runs. The synthetic PG17 harness does not provision Auth users in live Supabase. Customer access and billing remain sealed.
