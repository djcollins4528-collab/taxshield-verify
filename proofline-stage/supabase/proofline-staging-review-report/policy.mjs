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

/** Decode the payload only AFTER auth.getUser(token) has verified the token.
 * This parser never verifies a signature and must never be used for authorization alone. */
export function decodeVerifiedJwtPayload(token) {
 if(typeof token!=='string'||token.length>8192)return null;
 const parts=token.split('.');
 if(parts.length!==3||!parts.every(part=>part.length>0))return null;
 if(!/^[A-Za-z0-9_-]+$/.test(parts[1]))return null;
 try {
   const encoded=parts[1].replace(/-/g,'+').replace(/_/g,'/');
   const decoded=atob(encoded.padEnd(Math.ceil(encoded.length/4)*4,'='));
   const claims=JSON.parse(decoded);
   return claims && typeof claims==='object' && !Array.isArray(claims) ? claims : null;
 } catch { return null }
}
/** The JWT must already have passed getUser(token)'s signature/expiry check. */
export function matchesVerifiedSessionClaims(claims, verifiedUser, nowSeconds=Math.floor(Date.now()/1000)) {
 if(!claims || !isValidIdentity(verifiedUser))return false;
 if(typeof claims.session_id!=='string'||!UUID.test(claims.session_id))return false;
 if(claims.sub!==verifiedUser.id||claims.iss!==ISSUER)return false;
 if(claims.role!=='authenticated')return false;
 if(claims.aud!=='authenticated')return false;
 if(!Number.isSafeInteger(claims.exp)||claims.exp<=nowSeconds)return false;
 if(claims.nbf!==undefined&&(!Number.isSafeInteger(claims.nbf)||claims.nbf>nowSeconds))return false;
 return true;
}
/** Database must confirm both live Auth session and active requested-role membership. */
export function isAuthorizedLiveSession(rows) {
 return Array.isArray(rows)&&rows.length===1 &&
   rows[0]?.session_live===true && rows[0]?.membership_allowed===true;
}
