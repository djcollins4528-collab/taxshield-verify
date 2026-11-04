
create table proofline_private.synthetic_http_rehearsals (
 run_id uuid primary key default gen_random_uuid(),
 source text not null default 'staging_edge_function' check(source='staging_edge_function'),
 classification text not null default 'SYNTHETIC_STAGING_ONLY' check(classification='SYNTHETIC_STAGING_ONLY'),
 started_at timestamptz not null,
 finished_at timestamptz not null default clock_timestamp(),
 checks jsonb not null check(jsonb_typeof(checks)='array'),
 observed_count integer not null check(observed_count>=0 and observed_count<=30),
 passed_count integer not null check(passed_count>=0 and passed_count<=observed_count),
 outcome text not null check(outcome in ('PASSED_SYNTHETIC_ONLY','FAILED','CLEANUP_INCOMPLETE')),
 cleanup_confirmed boolean not null default false,
 observations_sha256 text not null check(observations_sha256 ~ '^[0-9a-f]{64}$'),
 production_release_eligible boolean not null default false check(production_release_eligible=false),
 customer_delivery_allowed boolean not null default false check(customer_delivery_allowed=false),
 check(jsonb_array_length(checks)=observed_count),
 check(outcome<>'PASSED_SYNTHETIC_ONLY' or (cleanup_confirmed and passed_count=observed_count and observed_count>=7))
);
alter table proofline_private.synthetic_http_rehearsals enable row level security;
revoke all on proofline_private.synthetic_http_rehearsals from public,anon,authenticated,service_role,proofline_stage_runtime;

create or replace function proofline_private.reject_http_rehearsal_changes_v1()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
begin
 raise exception 'synthetic HTTP rehearsal is append-only' using errcode='42501';
end $fn$;
revoke all on function proofline_private.reject_http_rehearsal_changes_v1() from public,anon,authenticated,service_role,proofline_stage_runtime;
create trigger proofline_http_rehearsal_append_only
 before update or delete on proofline_private.synthetic_http_rehearsals
 for each row execute function proofline_private.reject_http_rehearsal_changes_v1();

create or replace function proofline_private.record_http_rehearsal_v1(
 p_started_at timestamptz,p_checks jsonb,p_outcome text,p_cleanup boolean
) returns uuid language plpgsql security invoker set search_path=''
as $fn$
declare v_count integer;v_pass integer;v_hash text;v_id uuid;
begin
 if p_started_at is null or p_started_at>clock_timestamp() or p_started_at<clock_timestamp()-interval '15 minutes'
   or jsonb_typeof(p_checks)<>'array' or p_outcome not in ('PASSED_SYNTHETIC_ONLY','FAILED','CLEANUP_INCOMPLETE') or p_cleanup is null
 then raise exception 'invalid HTTP rehearsal metadata' using errcode='22023'; end if;
 v_count:=jsonb_array_length(p_checks);
 if v_count>30 then raise exception 'too many observations' using errcode='22023';end if;
 select count(*)::int into v_pass from jsonb_array_elements(p_checks) c
 where c->>'passed'='true'
   and c->>'name' is not null
   and c->>'status' ~ '^[0-9]{3}$';
 if p_outcome='PASSED_SYNTHETIC_ONLY' and (not p_cleanup or v_count<7 or v_count<>v_pass)
 then raise exception 'synthetic success observations incomplete' using errcode='42501';end if;
 if p_cleanup and exists(select 1 from auth.users) then
   raise exception 'cleanup has not been verified' using errcode='42501';end if;
 v_hash:=encode(extensions.digest(convert_to(p_checks::text,'UTF8'),'sha256'),'hex');
 insert into proofline_private.synthetic_http_rehearsals
 (started_at,checks,observed_count,passed_count,outcome,cleanup_confirmed,observations_sha256)
 values(p_started_at,p_checks,v_count,v_pass,p_outcome,p_cleanup,v_hash)
 returning run_id into v_id;
 return v_id;
end $fn$;
revoke all on function proofline_private.record_http_rehearsal_v1(timestamptz,jsonb,text,boolean)
 from public,anon,authenticated,service_role,proofline_stage_runtime;
