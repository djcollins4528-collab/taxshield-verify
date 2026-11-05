
create table proofline_private.synthetic_acceptance_receipts (
  run_id text primary key check (run_id ~ '^live-auth-[0-9a-f]{16}$'),
  collector_id uuid not null,
  reviewer_id uuid not null,
  client_claimed_check_count integer not null check (client_claimed_check_count between 12 and 100),
  database_observations jsonb not null,
  evidence_scope text not null default 'DATABASE_OBSERVED_ONLY'
    check (evidence_scope='DATABASE_OBSERVED_ONLY'),
  http_assertions_independently_verified boolean not null default false
    check (http_assertions_independently_verified=false),
  production_release_eligible boolean not null default false
    check (production_release_eligible=false),
  issued_at timestamptz not null default clock_timestamp(),
  check (collector_id<>reviewer_id),
  check (database_observations->>'auth_users_remaining'='0'),
  check (database_observations->>'memberships_remaining'='0'),
  check (database_observations->>'review_decisions_remaining'='0'),
  check (database_observations->>'enrollment_events'='2'),
  check (database_observations->>'revocation_events'='1')
);
alter table proofline_private.synthetic_acceptance_receipts enable row level security;
revoke all on proofline_private.synthetic_acceptance_receipts
 from public,anon,authenticated,service_role,proofline_stage_runtime;

create or replace function proofline_private.block_synthetic_acceptance_receipt_mutation_v1()
 returns trigger language plpgsql security invoker set search_path=''
as $$
begin
  raise exception 'synthetic acceptance receipts are append-only' using errcode='42501';
end
$$;
revoke all on function proofline_private.block_synthetic_acceptance_receipt_mutation_v1()
 from public,anon,authenticated,service_role,proofline_stage_runtime;
create trigger proofline_synthetic_receipt_immutable
 before update or delete on proofline_private.synthetic_acceptance_receipts
 for each row execute function proofline_private.block_synthetic_acceptance_receipt_mutation_v1();

create or replace function proofline_private.record_synthetic_acceptance_observation_v1(
 p_run_id text,p_collector uuid,p_reviewer uuid,p_client_count integer)
 returns text language plpgsql security invoker set search_path=''
as $$
declare c record; v_snapshot jsonb;
begin
 if p_run_id !~ '^live-auth-[0-9a-f]{16}$'
    or p_collector is null or p_reviewer is null or p_collector=p_reviewer
    or p_client_count not between 12 and 100
 then raise exception 'invalid synthetic acceptance metadata' using errcode='22023'; end if;
 select
    (select count(*) from auth.users)::integer as auth_users,
    (select count(*) from proofline_private.memberships)::integer as memberships,
    (select count(*) from proofline_private.report_review_decisions)::integer as decisions,
    (select count(*) from proofline_private.membership_change_log
      where tenant_id='bbbbaaaa-1111-4111-8111-000000000001'::uuid
      and auth_user_id in (p_collector,p_reviewer)
      and operation='INSERT' and occurred_at>=now()-interval '30 minutes')::integer as enrollments,
    (select count(*) from proofline_private.membership_change_log
      where tenant_id='bbbbaaaa-1111-4111-8111-000000000001'::uuid
      and auth_user_id=p_collector
      and active_before=true and active_after=false
      and occurred_at>=now()-interval '30 minutes')::integer as revocations,
    (select count(*) from proofline_private.staging_release_preflight_v1() where passed)::integer as passed
 into c;
 if c.auth_users<>0 or c.memberships<>0 or c.decisions<>0
     or c.enrollments<>2 or c.revocations<>1 or c.passed<3 or c.passed>5
 then raise exception 'database-side acceptance observations not satisfied'
  using errcode='42501'; end if;
 v_snapshot:=jsonb_build_object(
  'auth_users_remaining',c.auth_users,'memberships_remaining',c.memberships,
  'review_decisions_remaining',c.decisions,
  'enrollment_events',c.enrollments,'revocation_events',c.revocations,
  'readiness_checks_passed',c.passed,
  'http_evidence','NOT_INDEPENDENTLY_VERIFIED'
 );
 insert into proofline_private.synthetic_acceptance_receipts(
   run_id,collector_id,reviewer_id,client_claimed_check_count,database_observations
 ) values(p_run_id,p_collector,p_reviewer,p_client_count,v_snapshot);
 return p_run_id;
end $$;
revoke all on function proofline_private.record_synthetic_acceptance_observation_v1(text,uuid,uuid,integer)
 from public,anon,authenticated,service_role,proofline_stage_runtime;

CREATE OR REPLACE FUNCTION proofline_private.staging_release_preflight_v1()
 RETURNS TABLE(check_name text, passed boolean, observed text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with
stage as (
  select count(*) as n from proofline_private.tenants
  where id='bbbbaaaa-1111-4111-8111-000000000001'::uuid
    and environment='staging'
),
members as (
  select
    count(*) filter(where m.role='collector' and m.active and u.email_confirmed_at is not null and u.is_anonymous is false and coalesce(u.raw_app_meta_data->>'proofline_test_identity','false')<>'true' and coalesce(u.email,'') !~* '@example[.]com$') as collectors,
    count(*) filter(where m.role='reviewer' and m.active and u.email_confirmed_at is not null and u.is_anonymous is false and coalesce(u.raw_app_meta_data->>'proofline_test_identity','false')<>'true' and coalesce(u.email,'') !~* '@example[.]com$') as reviewers
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
  and m.active and u.email_confirmed_at is not null and u.is_anonymous is false and coalesce(u.raw_app_meta_data->>'proofline_test_identity','false')<>'true' and coalesce(u.email,'') !~* '@example[.]com$'
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
 where test_id like 'verified-live-auth-%' and status='passed'
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
$function$
;
comment on function proofline_private.staging_release_preflight_v1()
 is 'Live acceptance requires separately verified live-auth evidence. Synthetic database-observed receipts cannot pass production acceptance.';
