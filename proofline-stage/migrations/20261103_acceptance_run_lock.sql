-- Applied to the dedicated Proofline staging Supabase project.
-- One-use synthetic identity acceptance run guard. No public API access.
CREATE TABLE IF NOT EXISTS proofline_private.acceptance_once (
  test_id text PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL CHECK (status IN ('running','passed','failed')),
  check_count integer NOT NULL DEFAULT 0 CHECK (check_count >= 0)
);
ALTER TABLE proofline_private.acceptance_once ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE proofline_private.acceptance_once
FROM PUBLIC,anon,authenticated,proofline_stage_runtime,proofline_stage_login;
