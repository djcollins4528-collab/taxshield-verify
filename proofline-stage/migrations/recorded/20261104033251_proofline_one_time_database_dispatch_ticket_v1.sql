
create table proofline_private.http_rehearsal_dispatch (
 ticket_id uuid primary key default gen_random_uuid(),
 token_sha256 text not null check(token_sha256~'^[0-9a-f]{64}$'),
 state text not null default 'pending' check(state in ('pending','running','passed_synthetic','failed')),
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null,
 claimed_at timestamptz,
 completed_at timestamptz,
 pg_net_request_id bigint,
 upstream_http_status integer,
 rehearsal_receipt_id uuid,
 rehearsal_outcome text,
 checks_passed integer,
 checks_total integer,
 cleanup_confirmed boolean,
 production_release_eligible boolean not null default false check(production_release_eligible=false)
);
alter table proofline_private.http_rehearsal_dispatch enable row level security;
revoke all on proofline_private.http_rehearsal_dispatch from public,anon,authenticated,service_role,proofline_stage_runtime;

create or replace function proofline_private.queue_single_staging_http_rehearsal_v1()
returns uuid language plpgsql volatile security invoker set search_path=''
as $fn$
declare v_id uuid;v_token text;v_request bigint;
begin
 perform pg_catalog.pg_advisory_xact_lock(12771,1829);
 if exists (
  select 1 from proofline_private.http_rehearsal_dispatch d
  where d.state in ('pending','running') and d.created_at > clock_timestamp()-interval '5 minutes'
 ) then
  raise exception 'rehearsal dispatch already pending' using errcode='42501';
 end if;
 if (select count(*) from auth.users)<>0
 or (select count(*) from proofline_private.memberships)<>0
 or (select count(*) from proofline_private.report_review_decisions)<>0
 or (select count(*) from proofline_private.report_artifacts
    where tenant_id='bbbbaaaa-1111-4111-8111-000000000001'::uuid
    and classification='SYNTHETIC_STAGING_ONLY'
    and status='draft' and customer_delivery_allowed=false)<>1
 then
  raise exception 'isolated staging state required' using errcode='42501';
 end if;
 v_id:=gen_random_uuid();
 v_token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into proofline_private.http_rehearsal_dispatch(ticket_id,token_sha256,expires_at)
 values(v_id,encode(extensions.digest(pg_catalog.convert_to(v_token,'UTF8'),'sha256'),'hex'),
        clock_timestamp()+interval '2 minutes');
 select net.http_post(
  url:='https://pgknyzwctmfqvlivlgpe.supabase.co/functions/v1/proofline-rehearsal-dispatch',
  body:=pg_catalog.jsonb_build_object('ticket_id',v_id,'token',v_token),
  params:='{}'::jsonb,
  headers:='{"Content-Type":"application/json"}'::jsonb,
  timeout_milliseconds:=125000
 ) into v_request;
 update proofline_private.http_rehearsal_dispatch
  set pg_net_request_id=v_request where ticket_id=v_id;
 return v_id;
end $fn$;
revoke all on function proofline_private.queue_single_staging_http_rehearsal_v1()
 from public,anon,authenticated,service_role,proofline_stage_runtime;
