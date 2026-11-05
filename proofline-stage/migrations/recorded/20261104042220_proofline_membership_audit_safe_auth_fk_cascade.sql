alter function proofline_private.record_membership_change_v1() security definer;
revoke all on function proofline_private.record_membership_change_v1()
from public,anon,authenticated,service_role,proofline_stage_runtime,supabase_auth_admin;
comment on function proofline_private.record_membership_change_v1()
is 'Fixed-purpose membership audit trigger. SECURITY DEFINER permits FK cascades during Supabase Auth deletion without giving auth admin general private-schema access.';
