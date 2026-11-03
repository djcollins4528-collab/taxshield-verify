# Active membership and revocation hosted acceptance

This PR triggers the existing PostgreSQL 17 CI to apply and test the new active-membership RLS migration in a disposable database as a NOLOGIN/NOBYPASSRLS runtime role. It does not create or modify Supabase Auth users. Do not promote or enable the runtime login until the SQL tests pass and user sessions can be verified through the official Auth API.
