import {isValidIdentity, decodeVerifiedJwtPayload, matchesVerifiedSessionClaims} from '../proofline-staging-auth/policy.mjs';
export {STAGING_PROJECT, STAGING_TENANT, ISSUER} from '../proofline-staging-auth/policy.mjs';
export function verifiedSession(token,user) {
 if(!isValidIdentity(user))return null;
 const claims=decodeVerifiedJwtPayload(token);
 return matchesVerifiedSessionClaims(claims,user)?{actorId:user.id,sessionId:claims.session_id}:null;
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH=/^[0-9a-f]{64}$/;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keys=(v,expected)=>object(v)&&Object.keys(v).sort().join(',')===expected.split(',').sort().join(',');
const text=(v,min,max)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max&&!/[\u0000-\u001f\u007f]/.test(v);
export function validateAppend(v) {
 if(!keys(v,'artifact_id,expected_sha256,review_decision_id,finding_id,sequence,previous_id,kind,outcome,evidence'))return null;
 if(!UUID.test(v.artifact_id)||!UUID.test(v.review_decision_id)||!HASH.test(v.expected_sha256))return null;
 if(!text(v.finding_id,1,100)||v.finding_id!==v.finding_id.trim())return null;
 if(!Number.isInteger(v.sequence)||v.sequence<1||v.sequence>2147483647)return null;
 if(v.sequence===1 ? v.previous_id!==null||v.kind!=='remediation' : typeof v.previous_id!=='string'||!UUID.test(v.previous_id))return null;
 if(v.kind==='remediation') {if(v.outcome!==null)return null;}
 else if(v.kind==='reverification') {if(!['PASS','FAIL','INCONCLUSIVE','NOT_TESTED','NOT_APPLICABLE'].includes(v.outcome))return null;}
 else return null;
 const e=v.evidence;
 if(!keys(e,'classification,customer_data,observation,criterion,limitations')||e.classification!=='SYNTHETIC_STAGING_ONLY'||e.customer_data!==false)return null;
 if(!text(e.observation,15,4000)||!text(e.criterion,15,2000)||!text(e.limitations,15,2000))return null;
 // Keep margin under the database's 16 KiB jsonb-text limit, including escaping.
 if(new TextEncoder().encode(JSON.stringify(e)).byteLength>15000)return null;
 return v;
}
export function validateHistory(url) {
 const p=url.searchParams;
 if(p.size!==3||!['artifact_id','finding_id','after_sequence'].every(k=>p.getAll(k).length===1))return null;
 const artifact_id=p.get('artifact_id'),finding_id=p.get('finding_id'),cursor=p.get('after_sequence');
 if(!UUID.test(artifact_id)||!text(finding_id,1,100)||finding_id!==finding_id.trim()||!/^(0|[1-9][0-9]{0,9})$/.test(cursor))return null;
 const after_sequence=Number(cursor);
 return after_sequence<=2147483647?{artifact_id,finding_id,after_sequence}:null;
}
