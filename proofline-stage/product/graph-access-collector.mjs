// Authorized read-only Microsoft Graph collection. No token storage, tenant writes, or implicit scope expansion.
// Caller supplies an authenticated Graph transport and explicit, pre-approved immutable IDs.
import {createHash} from 'node:crypto';
const ID=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const allowed='https://graph.microsoft.com/v1.0/';
const fail=m=>{throw Error('GRAPH_COLLECTION_NO_GO: '+m)};
const norm=x=>x.toLowerCase();
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const requireId=(x,name)=>{if(typeof x!=='string'||!ID.test(x))fail('invalid '+name);return norm(x)};
const objKey=x=>x.kind+':'+norm(x.id);
const kinds=new Set(['static_group','directory_role','enterprise_app_assignment']);
export function validateScope(scope){
 if(!scope||scope.authorized!==true||scope.read_only!==true||scope.owner_approved!==true)
  fail('explicit owner-authorized read-only scope required');
 const tenant=requireId(scope.tenant_id,'tenant_id');
 const subject=requireId(scope.subject_id,'subject_id');
 if(!Array.isArray(scope.relationships)||!scope.relationships.length||scope.relationships.length>50)
  fail('1–50 explicitly named relationships required');
 const seen=new Set();
 for(const r of scope.relationships){
  if(!r||!kinds.has(r.kind))fail('unsupported relationship kind');
  requireId(r.id,'relationship ID');
  if(r.kind==='static_group'&&r.membership_type==='dynamic')fail('dynamic group not supported');
  if(seen.has(objKey(r)))fail('duplicate scope relationship');
  seen.add(objKey(r));
 }
 return {tenant,subject,scope_sha256:digest({tenant,subject,relationships:scope.relationships.map(objKey).sort()})};
}
function pageUri(url){
 const u=new URL(url,allowed);
 if(u.protocol!=='https:'||u.origin!=='https://graph.microsoft.com'||!u.pathname.startsWith('/v1.0/'))
  fail('Graph host or version not allowlisted');
 if(u.username||u.password||u.hash)fail('unsafe URL');
 return u.toString();
}
async function pages(get,url,maxPages=30){
 const results=[],visited=new Set();let next=pageUri(url),n=0;const basePath=new URL(next).pathname;
 while(next){
  if(visited.has(next)||++n>maxPages)fail('pagination loop or page budget exceeded');
  visited.add(next);
  const data=await get(next);
  if(!data||!Array.isArray(data.value))fail('incomplete or malformed Graph page');
  results.push(...data.value);
  if(results.length>5000)fail('result budget exceeded');
  next=data['@odata.nextLink']?pageUri(data['@odata.nextLink']):null;
  if(next&&new URL(next).pathname!==basePath)fail('pagination endpoint changed');
 }
 return results;
}
export async function collectAccessAssurance(scope,transport){
 const {tenant,subject,scope_sha256}=validateScope(scope);
 if(typeof transport!=='function')fail('authenticated transport required');
 // A request transport is injected for testability; it MUST already have an approved delegated token.
 const get=async url=>{
  const u=pageUri(url);
  try{return await transport(u)}catch(e){fail('Graph request failed or permissions insufficient: '+String(e?.message||e))}
 };
 const org=await pages(get,allowed+'organization?$select=id,displayName',3);
 if(org.length!==1||norm(requireId(org[0].id,'observed tenant'))!==tenant)fail('tenant mismatch');
 const user=await get(allowed+'users/'+subject+'?$select=id,accountEnabled,userType');
 if(!user||norm(requireId(user.id,'observed user'))!==subject)fail('subject mismatch');
 const scoped=scope.relationships.map(r=>({...r,id:norm(r.id)}));
 const needs=k=>scoped.some(r=>r.kind===k);
 const observed=[];
 if(needs('static_group')){
  const groups=await pages(get,allowed+'users/'+subject+'/memberOf/microsoft.graph.group?$select=id,groupTypes,securityEnabled',30);
  for(const g of groups){
   if(!ID.test(g.id||''))fail('invalid group response');
   if((g.groupTypes||[]).includes('DynamicMembership'))continue;
   if(scoped.some(r=>r.kind==='static_group'&&norm(r.id)===norm(g.id)))observed.push({kind:'static_group',id:norm(g.id)});
  }
 }
 if(needs('enterprise_app_assignment')){
  const apps=await pages(get,allowed+'users/'+subject+'/appRoleAssignments?$select=id,resourceId,appRoleId',30);
  for(const a of apps){
   if(!ID.test(a.resourceId||''))fail('invalid enterprise app response');
   if(scoped.some(r=>r.kind==='enterprise_app_assignment'&&norm(r.id)===norm(a.resourceId)))
    observed.push({kind:'enterprise_app_assignment',id:norm(a.resourceId)});
  }
 }
 if(needs('directory_role')){
  const roles=await pages(get,allowed+'roleManagement/directory/roleAssignments?$filter=principalId%20eq%20%27'+subject+'%27&$select=id,principalId,roleDefinitionId',30);
  for(const a of roles){
   if(!ID.test(a.roleDefinitionId||'')||norm(requireId(a.principalId,'role principal'))!==subject)
    fail('unexpected directory role response');
   if(scoped.some(r=>r.kind==='directory_role'&&norm(r.id)===norm(a.roleDefinitionId)))
    observed.push({kind:'directory_role',id:norm(a.roleDefinitionId)});
  }
 }
 const distinct=[...new Map(observed.map(r=>[objKey(r),r])).values()];
 const observed_at=new Date().toISOString();
 return {schema_version:1,source_type:'MICROSOFT_GRAPH_LIVE_READ_ONLY',synthetic:false,
  tenant_id:tenant,subject_id:subject,scope_sha256,observed_at,
  account_enabled:user.accountEnabled,subject_type:user.userType||null,
  scoped_relationships:scoped,observed_relationships:distinct,
  source:{pagination_complete:true,permissions_complete:true,graph_api:'v1.0',
    collected_at:observed_at,evidence_id:'GRAPH-'+digest({tenant,subject,observed_at}).slice(0,20),
    sha256:digest({tenant,subject,scoped,observed:distinct,user})},
  limitations:['Selected direct relationships only','No transitive/dynamic effective access claim','App assignment checks resource service principal IDs, not individual app roles','Directory roles reflect direct active assignments only; no PIM eligible or group-derived role claims','No evidence of business justification or reviewer approval']};
}
