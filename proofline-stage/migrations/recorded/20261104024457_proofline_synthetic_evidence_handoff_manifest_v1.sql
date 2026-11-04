
create or replace function proofline_private.synthetic_handoff_manifest_v1()
returns jsonb
language sql stable security invoker set search_path=''
as $fn$
with fixture as (
 select t.id,t.slug,t.environment
 from proofline_private.tenants t
 where t.id='bbbbaaaa-1111-4111-8111-000000000001'::uuid
   and t.slug='proofline-synthetic-db-probe'
   and t.environment='staging'
), sequence as (
 select e.*,lag(e.digest) over (order by e.seq) as prior_digest,
        row_number() over (order by e.seq) as ordinal
 from proofline_private.custody_events e join fixture f on f.id=e.tenant_id
), validation as (
 select count(*)::int as events,
        count(*) filter (where kind='evidence')::int as evidence_events,
        count(*) filter (where kind='review')::int as review_events,
        coalesce(bool_and(seq=ordinal and prev=case when ordinal=1 then 'GENESIS' else prior_digest end),false) as chain_links_valid,
        coalesce(bool_and(
          (kind='evidence' and role='collector' and reviewed_evidence_id is null)
          or (kind='review' and role='reviewer' and reviewed_evidence_id is not null
             and exists(select 1 from sequence earlier
                        where earlier.id=sequence.reviewed_evidence_id
                        and earlier.kind='evidence'
                        and earlier.seq<sequence.seq
                        and earlier.actor<>sequence.actor))
        ),false) as role_and_reference_valid
 from sequence
), metadata as (
 select coalesce(jsonb_agg(jsonb_build_object(
    'sequence',seq,'event_id',id,'event_type',kind,'role',role,
    'timestamp',at,'hash',digest,'previous_hash',prev,
    'reviewed_evidence_id',reviewed_evidence_id
  ) order by seq),'[]'::jsonb) as entries
 from sequence
)
select jsonb_build_object(
  'schema_version','1.0',
  'document_type','evidence_handoff_manifest',
  'classification','SYNTHETIC_STAGING_ONLY',
  'customer_deliverable',false,
  'tenant_slug',(select slug from fixture),
  'validation',jsonb_build_object(
    'event_count',v.events,
    'evidence_count',v.evidence_events,
    'review_count',v.review_events,
    'contiguous_hash_links',v.chain_links_valid,
    'independent_review_reference',v.role_and_reference_valid,
    'structural_checks_passed',v.events>=2 and v.evidence_events>=1 and v.review_events>=1 and v.chain_links_valid and v.role_and_reference_valid,
    'cryptographic_digest_recomputation_performed',false,
    'live_auth_verified',false
  ),
  'events',m.entries,
  'limitations',jsonb_build_array(
     'Synthetic actors do not represent authenticated users.',
     'Encrypted payload contents and cryptographic digest recomputation were not verified.',
     'This manifest is not a customer security assessment or production acceptance evidence.'
  )
)
from validation v cross join metadata m;
$fn$;
revoke all on function proofline_private.synthetic_handoff_manifest_v1() from public,anon,authenticated,service_role,proofline_stage_runtime;
