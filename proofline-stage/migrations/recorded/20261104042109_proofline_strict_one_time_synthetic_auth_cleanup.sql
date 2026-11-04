
create table proofline_private.synthetic_cleanup_tickets(
 ticket_id uuid primary key default gen_random_uuid(),
 token_sha256 text not null check(token_sha256 ~ '^[a-f0-9]{64}$'),
 state text not null default 'pending' check (state in ('pending','running','succeeded','failed')),
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null,
 claimed_at timestamptz,
 finished_at timestamptz,
 pg_net_request_id bigint,
 sanitized_result jsonb,
 production_release_eligible boolean not null default false check(production_release_eligible=false)
);
alter table proofline_private.synthetic_cleanup_tickets enable row level security;
revoke all on proofline_private.synthetic_cleanup_tickets from public,anon,authenticated,service_role,proofline_stage_runtime;
create or replace function proofline_private.queue_synthetic_cleanup_once_v1()
returns uuid language plpgsql security invoker volatile set search_path=''
as $fn$
declare v_id uuid; v_token text; v_net bigint;
begin
 perform pg_catalog.pg_advisory_xact_lock(1267,3049);
 if exists (select 1 from proofline_private.synthetic_cleanup_tickets
   where state in ('pending','running') and created_at>clock_timestamp()-interval '3 minutes')
 then raise exception 'another cleanup is pending' using errcode='42501'; end if;
 if (select count(*) from auth.users) <> 2
    or (select count(*) from proofline_private.memberships where active) <> 0
    or (select count(*) from proofline_private.report_review_decisions) <> 0
    or (select count(*) from auth.users
       where raw_app_meta_data->>'proofline_test_identity'='true'
         and raw_app_meta_data->>'proofline_environment'='staging'
         and (
           (raw_app_meta_data->>'proofline_test_role'='collector'
            and email ~ '^proofline-collector-[a-f0-9]{14}@example[.]com$')
           or
           (raw_app_meta_data->>'proofline_test_role'='reviewer'
            and email ~ '^proofline-reviewer-[a-f0-9]{14}@example[.]com$')
         )) <> 2
 then raise exception 'only exactly two inactive synthetic accounts may be cleaned' using errcode='42501'; end if;
 v_id:=gen_random_uuid();v_token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into proofline_private.synthetic_cleanup_tickets(ticket_id,token_sha256,expires_at)
 values(v_id,encode(extensions.digest(convert_to(v_token,'UTF8'),'sha256'),'hex'),clock_timestamp()+interval '90 seconds');
 select net.http_post(
  url:='https://pgknyzwctmfqvlivlgpe.supabase.co/functions/v1/proofline-synthetic-cleanup',
  body:=pg_catalog.jsonb_build_object('ticket_id',v_id,'token',v_token),
  headers:='{"Content-Type":"application/json"}'::jsonb,
  timeout_milliseconds:=45000
 ) into v_net;
 update proofline_private.synthetic_cleanup_tickets set pg_net_request_id=v_net where ticket_id=v_id;
 return v_id;
end $fn$;
revoke all on function proofline_private.queue_synthetic_cleanup_once_v1()
 from public,anon,authenticated,service_role,proofline_stage_runtime;
