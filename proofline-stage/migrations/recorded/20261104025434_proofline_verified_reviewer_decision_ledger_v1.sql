
create table proofline_private.report_review_decisions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references proofline_private.report_artifacts(id) on delete restrict,
  tenant_id uuid not null references proofline_private.tenants(id),
  artifact_sha256 text not null check (artifact_sha256 ~ '^[0-9a-f]{64}$'),
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  reviewer_session_id uuid not null,
  decision text not null check (decision in ('changes_requested','rejected')),
  rationale text not null check (length(trim(rationale)) between 15 and 2000),
  decided_at timestamptz not null default clock_timestamp(),
  unique (artifact_id)
);
alter table proofline_private.report_review_decisions enable row level security;
revoke all on proofline_private.report_review_decisions from public,anon,authenticated,service_role,proofline_stage_runtime;

create or replace function proofline_private.enforce_report_review_decision_v1()
returns trigger
language plpgsql security invoker set search_path=''
as $fn$
declare
  v_artifact proofline_private.report_artifacts%rowtype;
begin
  if tg_op <> 'INSERT' then
    raise exception 'review decisions are append-only' using errcode='42501';
  end if;

  select * into v_artifact from proofline_private.report_artifacts
   where id=new.artifact_id;
  if not found
    or v_artifact.tenant_id<>new.tenant_id
    or v_artifact.source_sha256<>new.artifact_sha256
    or v_artifact.classification<>'SYNTHETIC_STAGING_ONLY'
    or v_artifact.status<>'draft'
    or v_artifact.customer_delivery_allowed
    or v_artifact.approved_at is not null
    or v_artifact.reviewer_user_id is not null
    or v_artifact.source_snapshot#>>'{review,sign_off_status}'<>'NOT_SIGNED'
  then
    raise exception 'report artifact fingerprint or release state invalid'
     using errcode='42501';
  end if;

  if not exists(
    select 1
    from proofline_private.memberships m
    join auth.users u on u.id=m.auth_user_id
    where m.tenant_id=new.tenant_id
      and m.auth_user_id=new.reviewer_user_id
      and m.role='reviewer'
      and m.active
      and m.issuer='https://pgknyzwctmfqvlivlgpe.supabase.co/auth/v1'
      and m.subject=m.auth_user_id::text
      and u.is_anonymous is false
      and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until<=now())
  ) then
    raise exception 'active confirmed reviewer required' using errcode='42501';
  end if;

  if not exists(
    select 1 from auth.sessions s
    where s.id=new.reviewer_session_id
      and s.user_id=new.reviewer_user_id
      and (s.not_after is null or s.not_after>now())
  ) then
    raise exception 'live reviewer session required' using errcode='42501';
  end if;

  -- A reviewer may reject or request changes, never approve synthetic evidence.
  if new.decision not in ('rejected','changes_requested') then
    raise exception 'synthetic report cannot be approved' using errcode='42501';
  end if;

  -- Reviewer identity must not be a synthetic collector or the actual collector.
  if exists (
   select 1 from proofline_private.custody_events e
   where e.tenant_id=new.tenant_id
     and e.kind='evidence'
     and e.actor=new.reviewer_user_id::text
  ) then
   raise exception 'collector cannot review own evidence' using errcode='42501';
  end if;

  return new;
end;
$fn$;

revoke all on function proofline_private.enforce_report_review_decision_v1()
 from public,anon,authenticated,service_role,proofline_stage_runtime;
create trigger proofline_review_decision_guard
before insert or update or delete on proofline_private.report_review_decisions
for each row execute function proofline_private.enforce_report_review_decision_v1();

create or replace function proofline_private.record_staging_review_decision_v1(
  p_artifact_id uuid,
  p_reviewer_user_id uuid,
  p_reviewer_session_id uuid,
  p_expected_sha256 text,
  p_decision text,
  p_rationale text
)
returns uuid
language plpgsql security invoker set search_path=''
as $fn$
declare
  v_artifact proofline_private.report_artifacts%rowtype;
  v_decision_id uuid;
begin
 if p_artifact_id is null or p_reviewer_user_id is null
    or p_reviewer_session_id is null
    or p_expected_sha256 is null
    or p_rationale is null then
    raise exception 'complete reviewer decision context required' using errcode='22023';
 end if;
 if p_decision not in ('rejected','changes_requested') or p_decision is null then
    raise exception 'synthetic report approval is disabled' using errcode='42501';
 end if;
 if length(trim(p_rationale)) not between 15 and 2000 then
    raise exception 'reviewer rationale must be 15 to 2000 characters' using errcode='22023';
 end if;
 select * into v_artifact from proofline_private.report_artifacts
 where id=p_artifact_id for share;
 if not found or v_artifact.source_sha256<>p_expected_sha256 then
    raise exception 'report does not exist or digest mismatch' using errcode='42501';
 end if;
 insert into proofline_private.report_review_decisions
  (artifact_id,tenant_id,artifact_sha256,reviewer_user_id,reviewer_session_id,decision,rationale)
 values
  (p_artifact_id,v_artifact.tenant_id,p_expected_sha256,p_reviewer_user_id,p_reviewer_session_id,p_decision,trim(p_rationale))
 returning id into v_decision_id;
 return v_decision_id;
end;
$fn$;
revoke all on function proofline_private.record_staging_review_decision_v1(uuid,uuid,uuid,text,text,text)
 from public,anon,authenticated,service_role,proofline_stage_runtime;
