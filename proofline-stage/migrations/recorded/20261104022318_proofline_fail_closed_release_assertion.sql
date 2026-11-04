create or replace function proofline_private.require_staging_release_acceptance_v1()
returns void
language plpgsql stable security invoker set search_path = ''
as $fn$
declare
  v_failed text;
begin
  select string_agg(check_name,', ' order by check_name)
  into v_failed
  from proofline_private.staging_release_preflight_v1()
  where passed is distinct from true;
  if v_failed is not null then
    raise exception 'Proofline staging release blocked: %',v_failed
      using errcode='P0001';
  end if;
end;
$fn$;
revoke all on function proofline_private.require_staging_release_acceptance_v1() from public,anon,authenticated,service_role,proofline_stage_runtime;
