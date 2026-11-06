// Offline, explicitly synthetic Access Assurance evaluator. No Graph calls, customer collection or scheduling.
// A direct, in-scope relationship is not proof of effective access or business necessity.
const UUID=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const HASH=/^[a-f0-9]{64}$/i;
const KINDS=new Set(['static_group','directory_role','enterprise_app_assignment']);
const iso=x=>typeof x==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(x)&&Number.isFinite(Date.parse(x));
const err=x=>{throw Error('ASSURANCE_NO_GO: '+x)};
const unique=a=>new Set(a).size===a.length;
const key=r=>r.kind+':'+r.id.toLowerCase();
export function verifySnapshot(s){
 if(!s||s.synthetic!==true)err('only synthetic fixtures are accepted in this prototype');
 if(!UUID.test(s.tenant_id)||!UUID.test(s.subject_id)||!iso(s.observed_at))err('invalid tenant, identity or observation');
 if(!s.source||!HASH.test(s.source.sha256)||!s.source.evidence_id||!iso(s.source.collected_at))err('unverifiable source reference');
 if(!Array.isArray(s.scoped_relationships)||!Array.isArray(s.observed_relationships))err('missing scoped or observed relationships');
 for(const r of [...s.scoped_relationships,...s.observed_relationships]){
  if(!r||!UUID.test(r.id)||!KINDS.has(r.kind))err('unsupported relationship or invalid immutable ID');
 }
 if(!unique(s.scoped_relationships.map(key))||!unique(s.observed_relationships.map(key)))err('duplicate relationship');
 if(s.scoped_relationships.length>50)err('prototype maximum 50 named relationships');
 if(s.scoped_relationships.some(r=>r.kind==='static_group'&&r.membership_type==='dynamic'))err('dynamic groups are out of scope');
 if(s.observed_relationships.some(r=>!s.scoped_relationships.map(key).includes(key(r))))err('unscoped observation');
 if(s.source.pagination_complete!==true||s.source.permissions_complete!==true)err('source incomplete or unauthorized');
 if(Date.parse(s.source.collected_at)>Date.parse(s.observed_at))err('source timestamp later than observation');
 return true;
}
export function assessSnapshot(s){
 verifySnapshot(s);
 const actual=new Set(s.observed_relationships.map(key));
 const ownerJustification=s.owner_justifications||{};
 const findings=s.scoped_relationships.map(r=>{
  const present=actual.has(key(r));
  const justification=ownerJustification[key(r)]||null;
  return {kind:r.kind,relationship_id:r.id,presence:present?'PRESENT':'ABSENT',
    business_need:present?(justification?.attested===true?'OWNER_ATTESTED_NOT_INDEPENDENTLY_PROVEN':'NOT_ESTABLISHED'):'NOT_APPLICABLE',
    requires_owner_review:present&&justification?.attested!==true,
    evidence_id:s.source.evidence_id,observed_at:s.observed_at};
 });
 return {synthetic:true,tenant_id:s.tenant_id,subject_id:s.subject_id,observed_at:s.observed_at,
  scope_count:findings.length,findings,coverage:'NAMED_DIRECT_RELATIONSHIPS_ONLY',
  limitations:['Only selected, direct relationships are assessed','Absence is supported only within complete authorized source scope','Business necessity is not proven by a membership or owner attestation','No effective permission or external SaaS conclusion','No independent human review or customer authorization supplied']};
}
export function compareSnapshots(before,after){
 verifySnapshot(before);verifySnapshot(after);
 if(before.tenant_id.toLowerCase()!==after.tenant_id.toLowerCase()||
    before.subject_id.toLowerCase()!==after.subject_id.toLowerCase())err('cross-tenant or cross-identity drift');
 if(before.scoped_relationships.map(key).sort().join('|')!==after.scoped_relationships.map(key).sort().join('|'))err('scope mismatch');
 if(Date.parse(after.observed_at)<=Date.parse(before.observed_at))err('snapshot order');
 const prior=new Set(before.observed_relationships.map(key));
 const next=new Set(after.observed_relationships.map(key));
 return {synthetic:true,earlier_at:before.observed_at,later_at:after.observed_at,
  changes:after.scoped_relationships.map(r=>({kind:r.kind,relationship_id:r.id,
    state:prior.has(key(r))===next.has(key(r))?'UNCHANGED':next.has(key(r))?'ADDED':'REMOVED'})),
  conclusion:'SCOPE_BOUNDED_DRIFT_ONLY',human_review_required:true};
}
