export const STAGING_PROJECT = 'pgknyzwctmfqvlivlgpe';
export const STAGING_TENANT = 'bbbbaaaa-1111-4111-8111-000000000001';
export const ISSUER = 'https://pgknyzwctmfqvlivlgpe.supabase.co/auth/v1';
export const ROLES = Object.freeze(['collector','reviewer','auditor']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function parseAuthorizationRequest(method,requestUrl,header){
 if(method!=='GET')return {status:405,error:'method_not_allowed'};
 let url;try{url=new URL(requestUrl)}catch{return {status:400,error:'invalid_url'}}
 if(url.pathname.split('/').pop()!=='check')return {status:404,error:'not_found'};
 if(url.searchParams.size!==2||url.searchParams.getAll('tenant').length!==1||url.searchParams.getAll('role').length!==1)return {status:400,error:'invalid_request'};
 const tenant=url.searchParams.get('tenant'), role=url.searchParams.get('role');
 if(tenant!==STAGING_TENANT||!UUID.test(tenant))return {status:403,error:'tenant_disabled'};
 if(!ROLES.includes(role))return {status:400,error:'invalid_role'};
 if(typeof header!=='string'||!/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(header))return {status:401,error:'user_bearer_required'};
 return {status:200,token:header.slice(7),tenant,role};
}
export function isValidIdentity(user){return !!user&&typeof user.id==='string'&&UUID.test(user.id)&&!user.is_anonymous&&user.aud==='authenticated'}
export function isAuthorizedMembership(rows){return Array.isArray(rows)&&rows.length===1&&rows[0]?.allowed===true}
