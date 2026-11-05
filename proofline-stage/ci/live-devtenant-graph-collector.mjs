import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

export const LAB_TENANT_ID='c3a220f5-0086-484c-ae8c-bf3271ccfc73';
export const LAB_CLIENT_ID='c8723d21-f9af-4e31-8ca9-d754b1376444';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sha=x=>createHash('sha256').update(x).digest('hex');
const assert=(condition,message)=>{if(!condition)throw Error('GRAPH_NO_GO: '+message)};
function stamp(s){assert(typeof s==='string'&&Number.isFinite(Date.parse(s))&&/Z|[+-]\d\d:\d\d$/.test(s),'invalid UTC/offset timestamp');return new Date(s).toISOString();}
export function validateConfig(c){
 assert(c&&c.tenant_id===LAB_TENANT_ID,'only the previously approved lab tenant is allowed');
 assert(c.client_id===LAB_CLIENT_ID,'unapproved app client ID');
 assert(uuid.test(c.subject_id),'one exact lab subject object ID required');
 assert(typeof c.subject_upn==='string'&&c.subject_upn.endsWith('@'+c.approved_domain),'subject UPN does not match approved test domain');
 assert(c.explicit_readonly_authorization===true&&c.synthetic_lab_only===true,'authorized test-only scope not acknowledged');
 assert(Array.isArray(c.relationships)&&c.relationships.length<=5,'maximum five named relationships');
 for(const r of c.relationships)assert(r&&['group','app'].includes(r.kind)&&uuid.test(r.id),'unsupported relationship');
 assert(new Set(c.relationships.map(r=>r.kind+':'+r.id)).size===c.relationships.length,'duplicate relationships');
 const departure=stamp(c.departure_at),cutoff=stamp(c.cutoff_at);
 assert(Date.parse(cutoff)>=Date.parse(departure)&&Date.parse(cutoff)-Date.parse(departure)<=7*86400000,'observation window exceeds seven days');
 return {...c,departure_at:departure,cutoff_at:cutoff};
}
async function fetchPages(fetchImpl,accessToken,relative,limit=50){
 const prefix='https://graph.microsoft.com/v1.0/';
 const values=[],receipts=[];let url=prefix+relative;const visited=new Set();
 for(let page=0;url&&page<limit;page++){
  assert(url.startsWith(prefix)&&!visited.has(url),'Graph pagination loop or untrusted URL');
  visited.add(url);
  const res=await fetchImpl(url,{method:'GET',redirect:'error',headers:{Authorization:'Bearer '+accessToken,Accept:'application/json',ConsistencyLevel:'eventual'}});
  assert(res.status===200,'Graph HTTP '+res.status+' ('+new URL(url).pathname+')');
  const data=await res.json();
  assert(data&&Array.isArray(data.value),'Graph collection missing value array');
  values.push(...data.value);
  assert(values.length<=10000,'Graph collection exceeds cap');
  receipts.push({endpoint:new URL(url).pathname,page:page+1,count:data.value.length,digest:sha(JSON.stringify(data))});
  url=data['@odata.nextLink']||null;
 }
 assert(!url,'Graph pagination incomplete');
 return {values,receipts};
}
export async function collectLab(c,token,{fetchImpl=fetch,now=()=>new Date().toISOString()}={}){
 c=validateConfig(c);
 assert(typeof token==='string'&&token.length>40,'missing delegated access token');
 const prefix='https://graph.microsoft.com/v1.0/';
 const userUrl=prefix+'users/'+encodeURIComponent(c.subject_id)+'?$select=id,userPrincipalName,userType,accountEnabled,onPremisesSyncEnabled';
 const userRes=await fetchImpl(userUrl,{method:'GET',redirect:'error',headers:{Authorization:'Bearer '+token,Accept:'application/json'}});
 assert(userRes.status===200,'user GET denied '+userRes.status);
 const user=await userRes.json();
 assert(user.id?.toLowerCase()===c.subject_id.toLowerCase()&&user.userPrincipalName?.toLowerCase()===c.subject_upn.toLowerCase(),'wrong pinned lab identity');
 assert(user.userType==='Member'&&user.onPremisesSyncEnabled!==true,'subject not supported cloud-only member');
 const memberships=await fetchPages(fetchImpl,token,'users/'+c.subject_id+'/memberOf?$top=100');
 const assignments=await fetchPages(fetchImpl,token,'users/'+c.subject_id+'/appRoleAssignments?$top=100&$count=true');
 const query=encodeURIComponent('activityDateTime ge '+c.departure_at+' and activityDateTime le '+c.cutoff_at);
 const audit=await fetchPages(fetchImpl,token,'auditLogs/directoryAudits?$filter='+query+'&$top=100');
 const relationships=c.relationships.map(r=>({kind:r.kind,id:r.id,observed_present:r.kind==='group'?memberships.values.some(x=>x.id?.toLowerCase()===r.id.toLowerCase()&&x['@odata.type']==='#microsoft.graph.group'):assignments.values.some(x=>x.resourceId?.toLowerCase()===r.id.toLowerCase()&&x.principalId?.toLowerCase()===c.subject_id.toLowerCase()),coverage:'DIRECT_ONLY',observation_result:'OBSERVED_STATE_NOT_FULL_ACCESS_PROOF'}));
 return {
  classification:'AUTHORIZED READ-ONLY LAB COLLECTION - NOT CUSTOMER EVIDENCE',
  tenant_id:c.tenant_id,client_id:c.client_id,subject_id:c.subject_id,
  subject_upn:c.subject_upn,departure_at:c.departure_at,cutoff_at:c.cutoff_at,
  collected_at:now(),user:{accountEnabled:user.accountEnabled,userType:user.userType,onPremisesSyncEnabled:user.onPremisesSyncEnabled},
  relationships,source_receipts:[
   {endpoint:'/users/{id}',count:1,digest:sha(JSON.stringify(user))},
   ...memberships.receipts,...assignments.receipts,...audit.receipts
  ],
  audit_records_seen:audit.values.length,
  revocation_conclusion:'INCONCLUSIVE_UNTIL_ATTRIBUTABLE_EVENT_REVIEWED',
  directory_audit_event_ids:audit.values.map(x=>x.id).filter(x=>typeof x==='string').slice(0,1000),
  evidence_retained_approved:false,reviewer_independent_verified:false,delivery_approved:false,
  scope_limitation:'No application-local sessions, devices, mailbox grants, external SaaS or transitive relationships. Audit collection is contextual and must be independently assessed.'
 };
}
if(process.argv[1]&&import.meta.url===new URL('file://'+resolve(process.argv[1])).href){
 try{
  const configPath=process.argv[2],output=process.argv[3];
  assert(configPath&&output,'usage: node live-devtenant-graph-collector.mjs authorized-config.json output.json');
  const c=JSON.parse(await (await import('node:fs/promises')).readFile(configPath,'utf8'));
  const token=process.env.PROOFLINE_GRAPH_DELEGATED_TOKEN;
  assert(token,'delegated Graph token unavailable; do not paste a token into ChatGPT');
  const result=await collectLab(c,token);
  await writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({status:'GRAPH_LAB_COLLECTION_RECORDED',receipt_file:output,source_pages:result.source_receipts.length,delivery_approved:false}));
 }catch(err){console.error(err.message);process.exitCode=1;}
}
