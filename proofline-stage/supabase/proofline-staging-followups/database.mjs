import {STAGING_TENANT,ISSUER} from './policy.mjs';
// This adapter uses the existing server-only DB connection, never Data API grants.
// All values are bound parameters. The installed trigger independently enforces
// append-only history, role/session checks, chain order and evidence hashing.
export async function runFollowup(sql,route,payload,identity) {
 return sql.begin(async tx=>{
  await tx`set local statement_timeout='5s'`;
  await tx`set local lock_timeout='3s'`;
  const roles=route==='history'?['collector','reviewer']:[payload.kind==='remediation'?'collector':'reviewer'];
  const access=await tx`select m.role from proofline_private.memberships m join auth.users u on u.id=m.auth_user_id
   join auth.sessions s on s.user_id=u.id
   where m.tenant_id=${STAGING_TENANT}::uuid and m.auth_user_id=${identity.actorId}::uuid
   and m.issuer=${ISSUER} and m.subject=${identity.actorId} and m.active
   and m.role=any(${roles}::text[]) and u.is_anonymous=false and u.email_confirmed_at is not null
   and (u.banned_until is null or u.banned_until<=now())
   and s.id=${identity.sessionId}::uuid and (s.not_after is null or s.not_after>now())
  `;
  if(access.length!==1||!roles.includes(access[0].role))return null;
  const artifacts=await tx`select a.id,a.source_sha256 from proofline_private.report_artifacts a
   where a.id=${payload.artifact_id}::uuid and a.tenant_id=${STAGING_TENANT}::uuid
   and a.document_type='security_assessment_draft' and a.classification='SYNTHETIC_STAGING_ONLY'
   and a.status='draft' and not a.customer_delivery_allowed and a.approved_at is null
   and a.source_sha256=encode(extensions.digest(convert_to(a.source_snapshot::text,'UTF8'),'sha256'),'hex')
   and exists(select 1 from jsonb_array_elements(a.source_snapshot->'findings') f where f->>'finding_id'=${payload.finding_id})`;
  if(artifacts.length!==1)return null;
  if(route==='history') {
   const decisions=await tx`select id from proofline_private.report_review_decisions
    where artifact_id=${payload.artifact_id}::uuid and tenant_id=${STAGING_TENANT}::uuid
    and artifact_sha256=${artifacts[0].source_sha256} and decision='changes_requested' limit 1`;
   const events=await tx`select id,review_decision_id,artifact_sha256,finding_id,sequence,previous_id,kind,outcome,evidence,evidence_sha256,created_at
    from proofline_private.finding_followups where tenant_id=${STAGING_TENANT}::uuid
    and artifact_id=${payload.artifact_id}::uuid and finding_id=${payload.finding_id}
    and sequence>${payload.after_sequence} order by sequence limit 101`;
   const page=events.slice(0,100);
   return {artifact_id:payload.artifact_id,source_sha256:artifacts[0].source_sha256,
    role:access[0].role,change_request_id:decisions[0]?.id??null,finding_id:payload.finding_id,events:page,
    next_after_sequence:events.length>100?page[99].sequence:null};
  }
  if(artifacts[0].source_sha256!==payload.expected_sha256)return null;
  const rows=await tx`insert into proofline_private.finding_followups
   (tenant_id,artifact_id,review_decision_id,artifact_sha256,finding_id,sequence,previous_id,kind,actor_id,session_id,outcome,evidence,evidence_sha256)
   values(${STAGING_TENANT}::uuid,${payload.artifact_id}::uuid,${payload.review_decision_id}::uuid,
   ${payload.expected_sha256},${payload.finding_id},${payload.sequence},${payload.previous_id}::uuid,
   ${payload.kind},${identity.actorId}::uuid,${identity.sessionId}::uuid,${payload.outcome},${tx.json(payload.evidence)},${'0'.repeat(64)})
   returning id,sequence,evidence_sha256,created_at`;
  if(rows.length!==1)throw new Error('append_result_missing');
  return {event:rows[0],status:'recorded'};
 });
}
