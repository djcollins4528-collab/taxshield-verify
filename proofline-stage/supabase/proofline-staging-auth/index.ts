import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
import postgres from 'npm:postgres@3.4.7';
import { ISSUER,STAGING_PROJECT,parseAuthorizationRequest,isValidIdentity,isAuthorizedMembership } from './policy.mjs';
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY','content-security-policy':"default-src 'none'; frame-ancestors 'none'"};
const response=(status,body)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
Deno.serve(async(req)=>{
 const check=parseAuthorizationRequest(req.method,req.url,req.headers.get('authorization'));
 if(check.status!==200)return response(check.status,{error:check.error});
 const authKey=Deno.env.get('SUPABASE_ANON_KEY');
 const dbUrl=Deno.env.get('SUPABASE_DB_URL');
 const url=Deno.env.get('SUPABASE_URL');
 if(!authKey||!dbUrl||url!==`https://${STAGING_PROJECT}.supabase.co`)return response(503,{error:'staging_not_configured'});
 const auth=createClient(url,authKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 let user;
 try{
   const v=await auth.auth.getUser(check.token);
   if(v.error||!isValidIdentity(v.data?.user))return response(401,{error:'verified_user_required'});
   user=v.data.user;
 }catch{return response(401,{error:'verified_user_required'})}
 const sql=postgres(dbUrl,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 try{
   const rows=await sql`SELECT EXISTS (
     SELECT 1 FROM proofline_private.memberships
     WHERE tenant_id=${check.tenant}::uuid
       AND issuer=${ISSUER}
       AND subject=${user.id}
       AND role=${check.role}
       AND active=true
   ) AS allowed`;
   if(!isAuthorizedMembership(rows))return response(403,{error:'membership_required'});
   return response(200,{authorized:true,tenant:check.tenant,role:check.role,scope:'synthetic_only'});
 }catch{return response(503,{error:'membership_check_unavailable'})}
 finally{await sql.end({timeout:2}).catch(()=>{})}
});
