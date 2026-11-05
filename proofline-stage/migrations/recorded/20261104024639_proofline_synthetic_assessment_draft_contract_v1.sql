
create or replace function proofline_private.synthetic_assessment_draft_v1()
returns jsonb
language sql stable security invoker set search_path=''
as $fn$
with manifest as (
 select proofline_private.synthetic_handoff_manifest_v1() as doc
), events as (
 select doc, doc #>> '{events,0,event_id}' as evidence_event_id,
   doc #>> '{events,1,event_id}' as review_event_id
 from manifest
), checks as (
 select doc,evidence_event_id,review_event_id,
    coalesce((doc #>> '{validation,structural_checks_passed}')::boolean,false) as structural_pass
 from events
)
select jsonb_build_object(
 'schema_version','1.0',
 'document_type','security_assessment_draft',
 'classification','SYNTHETIC_STAGING_ONLY',
 'report_status','DRAFT_NOT_APPROVED',
 'customer_deliverable',false,
 'prepared_for','Proofline internal acceptance testing',
 'scope',jsonb_build_object(
    'environment','staging',
    'scope_name','synthetic custody and review workflow',
    'tenant_slug',doc->>'tenant_slug',
    'real_customer_tenant',false,
    'technical_controls_assessed',jsonb_build_array('event sequence structure','review reference structure','authentication acceptance status')
 ),
 'executive_summary',jsonb_build_object(
    'headline','Synthetic evidence pipeline assessment draft',
    'narrative','This document evaluates only the structure of a synthetic test fixture. It does not establish the security posture of any customer Microsoft 365 tenant or other system.',
    'release_recommendation','DO_NOT_RELEASE'
 ),
 'findings',jsonb_build_array(
    jsonb_build_object(
      'finding_id','PL-SYN-001',
      'title','Synthetic custody chain structurally linked',
      'category','test_control',
      'severity','informational',
      'result',case when structural_pass then 'PASS' else 'FAIL' end,
      'verified_scope','structural_only',
      'evidence_references',jsonb_build_array(evidence_event_id,review_event_id),
      'observation','The synthetic sequence and reviewer reference were checked for consistency; source-event digests and encrypted content were not cryptographically independently verified.',
      'remediation','Before any real engagement, recompute each event digest from canonical source bytes and validate the independently held signing keys and chain head.',
      'verification_criteria','A separately executed cryptographic verifier produces matching digests for every event and checks offsite receipts.'
    ),
    jsonb_build_object(
      'finding_id','PL-SYN-002',
      'title','Real-user authentication acceptance outstanding',
      'category','release_blocker',
      'severity','high',
      'result','NOT_TESTED',
      'verified_scope','staging_readiness',
      'evidence_references','[]'::jsonb,
      'observation','No live collector or reviewer authentication acceptance is asserted by this synthetic fixture.',
      'remediation','Execute authorized live Auth-user enrollment, role separation, session verification, access revocation, and cleanup tests; retain signed acceptance results.',
      'verification_criteria','The release preflight passes under verified real-user sessions and externally reviewed evidence.'
    )
 ),
 'remediation_plan',jsonb_build_array(
    jsonb_build_object('priority',1,'finding_id','PL-SYN-002','action','Complete real-user authorization and revocation acceptance','status','blocked','owner_role','engineering'),
    jsonb_build_object('priority',2,'finding_id','PL-SYN-001','action','Implement and independently execute full cryptographic chain verification','status','not_started','owner_role','security_reviewer')
 ),
 'evidence_manifest',doc,
 'review',jsonb_build_object(
     'reviewer_user_id',null,
     'sign_off_status','NOT_SIGNED',
     'approved_at',null,
     'independent_review_of_report_complete',false
 ),
 'delivery_controls',jsonb_build_object(
     'export_eligible',false,
     'customer_delivery_allowed',false,
     'payment_required_or_collected',false
 ),
 'limitations',jsonb_build_array(
  'Findings describe synthetic workflow tests only; they are not allegations of customer vulnerabilities.',
  'No live authenticated reviewer has approved this assessment.',
  'Cryptographic verification, customer authorization, and production acceptance remain outstanding.'
 )
)
from checks;
$fn$;
revoke all on function proofline_private.synthetic_assessment_draft_v1() from public,anon,authenticated,service_role,proofline_stage_runtime;
