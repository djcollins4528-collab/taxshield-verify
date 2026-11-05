import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
import postgres from 'npm:postgres@3.4.7';
import {STAGING_PROJECT, STAGING_TENANT, ISSUER, isValidIdentity,decodeVerifiedJwtPayload,matchesVerifiedSessionClaims} from './policy.mjs';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff','x-frame-options':'DENY','content-security-policy':"default-src 'none'; frame-ancestors 'none'"};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH=/^[0-9a-f]{64}$/;
const ALLOWED_ORIGINS=new Set(["https://proofline-assurance-staging.vercel.app","https://proofline-assurance-staging-6zjg9n6ba.vercel.app","https://proofline-assurance-staging-djcollins4528-1987s-projects.vercel.app"]);
const corsFor=(req)=>{const origin=req.headers.get('origin');return origin&&ALLOWED_ORIGINS.has(origin)?{'access-control-allow-origin':origin,'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'authorization, apikey, content-type, x-client-info','access-control-max-age':'600','vary':'Origin'}:{'vary':'Origin'};};
Deno.serve(async req=>{
 const response=(status,body)=>new Response(JSON.stringify(body),{status,headers:{...H,...corsFor(req)}});
 if(req.method==='OPTIONS')return ALLOWED_ORIGINS.has(req.headers.get('origin')||'')?new Response(null,{status:204,headers:corsFor(req)}):response(403,{error:'origin_not_allowed'});
 if(req.method!=='GET')return response(405,{error:'method_not_allowed'});
 let url;try{url=new URL(req.url)}catch{return response(400,{error:'invalid_request'})}
 if(url.pathname.split('/').pop()!=='report')return response(404,{error:'not_found'});
 if(url.searchParams.size!==1||url.searchParams.getAll('artifact_id').length!==1)return response(400,{error:'artifact_id_required'});
 const artifactId=url.searchParams.get('artifact_id');
 if(!artifactId||!UUID.test(artifactId))return response(400,{error:'invalid_artifact_id'});
 const bearer=req.headers.get('authorization');
 if(!bearer||!/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(bearer))return response(401,{error:'user_bearer_required'});
 const host='https://'+STAGING_PROJECT+'.supabase.co';
 const anon=Deno.env.get('SUPABASE_ANON_KEY'),db=Deno.env.get('SUPABASE_DB_URL');
 if(Deno.env.get('SUPABASE_URL')!==host||!anon||!db)return response(503,{error:'staging_not_configured'});
 const auth=createClient(host,anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const token=bearer.slice(7);let user;
 try{const v=await auth.auth.getUser(token);if(v.error||!isValidIdentity(v.data?.user))return response(401,{error:'verified_user_required'});user=v.data.user}
 catch{return response(401,{error:'verified_user_required'})}
 const claims=decodeVerifiedJwtPayload(token);
 if(!matchesVerifiedSessionClaims(claims,user))return response(401,{error:'verified_session_required'});
 const sql=postgres(db,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 try{
   const result=await sql.begin(async tx=>{
    const allowed=await tx`select
     exists(select 1 from auth.sessions s where s.id=${claims.session_id}::uuid
        and s.user_id=${user.id}::uuid and (s.not_after is null or s.not_after>now())) as live,
     exists(select 1 from proofline_private.memberships m join auth.users u on u.id=m.auth_user_id
        where m.tenant_id=${STAGING_TENANT}::uuid and m.auth_user_id=${user.id}::uuid
        and m.issuer=${ISSUER} and m.subject=${user.id}
        and m.role='reviewer' and m.active=true and u.is_anonymous=false
        and u.email_confirmed_at is not null
        and (u.banned_until is null or u.banned_until<=now())) as reviewer`;
    if(allowed.length!==1||!allowed[0].live||!allowed[0].reviewer)return {denied:true};
    const rows=await tx`select a.id, a.source_sha256,a.source_snapshot,a.created_at, encode(extensions.digest(convert_to(a.source_snapshot::text,'UTF8'),'sha256'),'hex') as computed_sha256
       from proofline_private.report_artifacts a
       where a.id=${artifactId}::uuid and a.tenant_id=${STAGING_TENANT}::uuid
        and a.document_type='security_assessment_draft'
        and a.classification='SYNTHETIC_STAGING_ONLY'
        and a.status='draft' and a.customer_delivery_allowed=false
        and a.approved_at is null and a.reviewer_user_id is null
        and a.source_snapshot->>'classification'='SYNTHETIC_STAGING_ONLY'
        and a.source_snapshot->>'report_status'='DRAFT_NOT_APPROVED'
        and a.source_snapshot#>>'{review,sign_off_status}'='NOT_SIGNED'
        and a.source_snapshot#>>'{delivery_controls,customer_delivery_allowed}'='false'
       limit 1`;
    if(rows.length!==1)return {missing:true};
    const item=rows[0];
    if(!HASH.test(item.source_sha256))return {unavailable:true};
    if(item.computed_sha256!==item.source_sha256)return {unavailable:true};
    const reviews=await tx`select decision,decided_at from proofline_private.report_review_decisions
      where artifact_id=${artifactId}::uuid and tenant_id=${STAGING_TENANT}::uuid
      order by decided_at desc limit 1`;
    return {artifact_id:item.id,created_at:item.created_at,source_sha256:item.source_sha256,
        classification:'SYNTHETIC_STAGING_ONLY',report:typeof item.source_snapshot==='string'?JSON.parse(item.source_snapshot):item.source_snapshot,
        decision_recorded:reviews.length===1,
        decision:reviews[0]?.decision??null,
        customer_delivery_allowed:false,approval_allowed:false};
   });
   if(result.denied)return response(403,{error:'reviewer_session_required'});
   if(result.missing)return response(404,{error:'report_not_found'});
   if(result.unavailable)return response(503,{error:'report_integrity_unavailable'});
   return response(200,result);
 }catch(error){
   console.error('proofline_report_read_failure',{code:typeof error?.code==='string'?error.code:'unknown',name:typeof error?.name==='string'?error.name:'unknown'});
   return response(503,{error:'report_read_unavailable'});
 }
 finally{await sql.end({timeout:2}).catch(()=>{})}
});
