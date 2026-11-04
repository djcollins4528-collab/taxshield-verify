
create table if not exists proofline_private.membership_change_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default clock_timestamp(),
  operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
  membership_id uuid not null,
  tenant_id uuid not null,
  auth_user_id uuid not null,
  role_before text,
  role_after text,
  active_before boolean,
  active_after boolean,
  executed_by text not null default current_user,
  constraint membership_change_log_role_before check (role_before is null or role_before in ('collector','reviewer','auditor')),
  constraint membership_change_log_role_after check (role_after is null or role_after in ('collector','reviewer','auditor'))
);
alter table proofline_private.membership_change_log enable row level security;
revoke all on proofline_private.membership_change_log from public, anon, authenticated, service_role, proofline_stage_runtime;
revoke all on sequence proofline_private.membership_change_log_id_seq from public, anon, authenticated, service_role, proofline_stage_runtime;
create or replace function proofline_private.record_membership_change_v1()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and old.role is not distinct from new.role
    and old.active is not distinct from new.active
    and old.tenant_id is not distinct from new.tenant_id
    and old.auth_user_id is not distinct from new.auth_user_id
  then
    return new;
  end if;
  insert into proofline_private.membership_change_log (
    operation,membership_id,tenant_id,auth_user_id,
    role_before,role_after,active_before,active_after
  ) values (
    tg_op,coalesce(new.id,old.id),coalesce(new.tenant_id,old.tenant_id),
    coalesce(new.auth_user_id,old.auth_user_id),
    case when tg_op='INSERT' then null else old.role end,
    case when tg_op='DELETE' then null else new.role end,
    case when tg_op='INSERT' then null else old.active end,
    case when tg_op='DELETE' then null else new.active end
  );
  return case when tg_op='DELETE' then old else new end;
end; $$;
revoke all on function proofline_private.record_membership_change_v1() from public,anon,authenticated,service_role,proofline_stage_runtime;
drop trigger if exists proofline_membership_change_audit on proofline_private.memberships;
create trigger proofline_membership_change_audit
after insert or update or delete on proofline_private.memberships
for each row execute function proofline_private.record_membership_change_v1();
create or replace function proofline_private.reject_membership_log_change_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin raise exception 'membership change log is append-only' using errcode='42501'; end; $$;
revoke all on function proofline_private.reject_membership_log_change_v1() from public,anon,authenticated,service_role,proofline_stage_runtime;
create trigger proofline_membership_log_immutable
before update or delete on proofline_private.membership_change_log
for each row execute function proofline_private.reject_membership_log_change_v1();
