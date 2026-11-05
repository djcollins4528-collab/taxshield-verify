create or replace function proofline_private.staging_release_preflight_v1()
returns table(check_name text, passed boolean, observed text)
language sql stable security invoker set search_path = ''
as $fn$
with
stage as (
  select count(*) as n from proofline_private.tenants
  where id='bbbbaaaa-1111-4111-8111-000000000001'::uuid
    and environment='staging'
),
members as (
  select
    count(*) filter(where m.role='collector' and m.active and u.email_confirmed_at is not null and u.is_anonymous is false) as collectors,
    count(*) filter(where m.role='reviewer' and m.active and u.email_confirmed_at is not null and u.is_anonymous is false) as reviewers
  from proofline_private.memberships m
  join auth.users u on u.id=m.auth_user_id
  where m.tenant_id='bbbbaaaa-1111-4111-8111-000000000001'::uuid
),
live_sessions as (
 select
  count(distinct m.auth_user_id) filter(where m.role='collector') as collectors,
  count(distinct m.auth_user_id) filter(where m.role='reviewer') as reviewers
 from proofline_private.memberships m
 join auth.sessions s on s.user_id=m.auth_user_id
 join auth.users u on u.id=m.auth_user_id
 where m.tenant_id='bbbbaaaa-1111-4111-8111-000000000001'::uuid
  and m.active and u.email_confirmed_at is not null and u.is_anonymous is false
  and (s.not_after is null or s.not_after>now())
),
revocations as (
 select count(*) as n from proofline_private.membership_change_log
 where tenant_id='bbbbaaaa-1111-4111-8111-000000000001'::uuid
 and active_before=true and active_after=false
 and occurred_at>=now()-interval '24 hours'
),
runs as (
 select count(*) as n from proofline_private.acceptance_once
 where test_id like 'live-auth-%' and status='passed'
 and check_count>=8 and finished_at>=now()-interval '24 hours'
),
rls as (
 select count(*) filter(where c.relrowsecurity) as enabled, count(*) as total
 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on c.relnamespace=n.oid
 where n.nspname='proofline_private' and c.relkind='r'
),
public_access as (
 select count(*) as n
 from pg_catalog.pg_class c
 join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where n.nspname='proofline_private' and c.relkind='r'
 and (pg_catalog.has_table_privilege('anon',c.oid,'SELECT')
   or pg_catalog.has_table_privilege('authenticated',c.oid,'SELECT')
   or pg_catalog.has_table_privilege('anon',c.oid,'INSERT')
   or pg_catalog.has_table_privilege('authenticated',c.oid,'INSERT'))
)
select 'staging_tenant'::text,(select n=1 from stage), (select n::text from stage)
union all
select 'confirmed_collector',(select collectors>=1 from members),(select collectors::text from members)
union all
select 'confirmed_reviewer',(select reviewers>=1 from members),(select reviewers::text from members)
union all
select 'live_collector_session',(select collectors>=1 from live_sessions),(select collectors::text from live_sessions)
union all
select 'live_reviewer_session',(select reviewers>=1 from live_sessions),(select reviewers::text from live_sessions)
union all
select 'revocation_observed_24h',(select n>=1 from revocations),(select n::text from revocations)
union all
select 'live_acceptance_passed_24h',(select n>=1 from runs),(select n::text from runs)
union all
select 'private_tables_rls_enabled',(select enabled=total and total>=7 from rls),(select enabled::text||'/'||total::text from rls)
union all
select 'no_client_private_table_grants',(select n=0 from public_access),(select n::text from public_access);
$fn$;
revoke all on function proofline_private.staging_release_preflight_v1() from public,anon,authenticated,service_role,proofline_stage_runtime;
