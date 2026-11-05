
create table proofline_private.report_artifacts (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references proofline_private.tenants(id),
 document_type text not null check(document_type='security_assessment_draft'),
 classification text not null check(classification='SYNTHETIC_STAGING_ONLY'),
 status text not null default 'draft' check(status='draft'),
 source_snapshot jsonb not null,
 source_sha256 text not null check(source_sha256 ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default now(),
 reviewer_user_id uuid references auth.users(id),
 approved_at timestamptz,
 customer_delivery_allowed boolean not null default false check(customer_delivery_allowed=false),
 constraint report_artifact_synthetic_unapproved check(reviewer_user_id is null and approved_at is null),
 constraint report_artifact_source_contract check(
  source_snapshot->>'classification'='SYNTHETIC_STAGING_ONLY'
  and source_snapshot->>'customer_deliverable'='false'
  and source_snapshot->>'report_status'='DRAFT_NOT_APPROVED'
  and source_snapshot #>> '{review,sign_off_status}'='NOT_SIGNED'
  and source_snapshot #>> '{delivery_controls,customer_delivery_allowed}'='false'
  and source_snapshot #>> '{executive_summary,release_recommendation}'='DO_NOT_RELEASE'
 ),
 unique(tenant_id,source_sha256)
);
alter table proofline_private.report_artifacts enable row level security;
revoke all on proofline_private.report_artifacts from public,anon,authenticated,service_role,proofline_stage_runtime;

create or replace function proofline_private.reject_report_artifact_mutation_v1()
returns trigger language plpgsql security invoker set search_path=''
as $f$
begin
  raise exception 'report artifacts are append-only; create a new version' using errcode='42501';
end;$f$;
revoke all on function proofline_private.reject_report_artifact_mutation_v1() from public,anon,authenticated,service_role,proofline_stage_runtime;
create trigger proofline_report_artifact_immutable
before update or delete on proofline_private.report_artifacts
for each row execute function proofline_private.reject_report_artifact_mutation_v1();

create or replace function proofline_private.snapshot_synthetic_assessment_v1()
returns uuid language plpgsql security invoker set search_path=''
as $f$
declare
 v_tenant uuid:='bbbbaaaa-1111-4111-8111-000000000001'::uuid;
 v_document jsonb;
 v_hash text;
 v_id uuid;
begin
 v_document:=proofline_private.synthetic_assessment_draft_v1();
 if v_document is null
   or v_document->>'classification'<>'SYNTHETIC_STAGING_ONLY'
   or v_document->>'report_status'<>'DRAFT_NOT_APPROVED'
   or v_document#>>'{delivery_controls,customer_delivery_allowed}'<>'false'
   or v_document#>>'{evidence_manifest,validation,structural_checks_passed}'<>'true'
 then
   raise exception 'synthetic report contract unavailable' using errcode='42501';
 end if;
 v_hash:=encode(extensions.digest(convert_to(v_document::text,'UTF8'),'sha256'),'hex');
 insert into proofline_private.report_artifacts(
   tenant_id,document_type,classification,status,source_snapshot,source_sha256
 ) values (
   v_tenant,'security_assessment_draft','SYNTHETIC_STAGING_ONLY','draft',v_document,v_hash
 ) on conflict(tenant_id,source_sha256) do nothing
 returning id into v_id;
 if v_id is null then
    select id into v_id from proofline_private.report_artifacts
      where tenant_id=v_tenant and source_sha256=v_hash;
 end if;
 return v_id;
end;$f$;
revoke all on function proofline_private.snapshot_synthetic_assessment_v1() from public,anon,authenticated,service_role,proofline_stage_runtime;
