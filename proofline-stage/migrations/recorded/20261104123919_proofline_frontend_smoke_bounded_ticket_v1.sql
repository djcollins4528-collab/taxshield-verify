
create table proofline_private.frontend_smoke_runs (
 ticket_id uuid primary key default gen_random_uuid(),
 token_sha256 text not null check(token_sha256 ~ '^[0-9a-f]{64}$'),
 status text not null default 'pending' check (status in ('pending','running','passed','failed')),
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null,
 started_at timestamptz,
 finished_at timestamptz,
 pg_net_request_id bigint,
 results jsonb,
 classification text not null default 'SYNTHETIC_STAGING_ONLY' check (classification='SYNTHETIC_STAGING_ONLY'),
 production_release_eligible boolean not null default false check (production_release_eligible=false),
 customer_delivery_allowed boolean not null default false check (customer_delivery_allowed=false)
);
alter table proofline_private.frontend_smoke_runs enable row level security;
revoke all on proofline_private.frontend_smoke_runs from public,anon,authenticated,service_role,proofline_stage_runtime;
create or replace function proofline_private.queue_frontend_smoke_once_v1()
 returns uuid language plpgsql volatile security invoker set search_path=''
as $fn$
declare v_ticket uuid; v_token text; v_request bigint;
begin
 perform pg_catalog.pg_advisory_xact_lock(12293,5501);
 if exists(select 1 from proofline_private.frontend_smoke_runs
      where created_at>clock_timestamp()-interval '5 minutes')
 then raise exception 'frontend smoke rate limited' using errcode='42501';end if;
 if (select count(*) from auth.users)<>0
   or (select count(*) from auth.sessions)<>0
   or (select count(*) from proofline_private.memberships where active)<>0
   or (select count(*) from proofline_private.report_review_decisions)<>0
 then raise exception 'staging is not isolated' using errcode='42501';end if;
 v_ticket:=gen_random_uuid();v_token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into proofline_private.frontend_smoke_runs(ticket_id,token_sha256,expires_at)
 values(v_ticket,encode(extensions.digest(convert_to(v_token,'UTF8'),'sha256'),'hex'),
   clock_timestamp()+interval '90 seconds');
 select net.http_post(
   url:='https://pgknyzwctmfqvlivlgpe.supabase.co/functions/v1/proofline-frontend-smoke',
   body:=jsonb_build_object('ticket_id',v_ticket,'token',v_token),
   headers:='{"content-type":"application/json"}'::jsonb,
   timeout_milliseconds:=55000
 ) into v_request;
 update proofline_private.frontend_smoke_runs set pg_net_request_id=v_request
 where ticket_id=v_ticket;
 return v_ticket;
end $fn$;
revoke all on function proofline_private.queue_frontend_smoke_once_v1()
 from public,anon,authenticated,service_role,proofline_stage_runtime;
