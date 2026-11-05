import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
import postgres from 'npm:postgres@3.4.7';
import {STAGING_PROJECT, STAGING_TENANT, ISSUER, isValidIdentity, decodeVerifiedJwtPayload, matchesVerifiedSessionClaims} from './policy.mjs';

const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY','content-security-policy':"default-src 'none'; frame-ancestors 'none'"};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH=/^[0-9a-f]{64}$/;
const MAX_BODY=4096;

function validateBody(value) {
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 if(Object.keys(value).sort().join(',')!=='artifact_id,decision,expected_sha256,rationale')return null;
 if(typeof value.artifact_id!=='string'||!UUID.test(value.artifact_id))return null;
 if(typeof value.expected_sha256!=='string'||!HASH.test(value.expected_sha256))return null;
 if(value.decision!=='rejected'&&value.decision!=='changes_requested')return null;
 if(typeof value.rationale!=='string'||value.rationale.trim().length<15||value.rationale.trim().length>2000)return null;
 if(/[\u0000-\u001f]/.test(value.rationale))return null;
 return value;
}

const ALLOWED_ORIGINS=new Set(["https://proofline-assurance-staging.vercel.app","https://proofline-assurance-staging-6zjg9n6ba.vercel.app","https://proofline-assurance-staging-djcollins4528-1987s-projects.vercel.app"]);
const corsFor=(req)=>{const origin=req.headers.get('origin');return origin&&ALLOWED_ORIGINS.has(origin)?{'access-control-allow-origin':origin,'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'authorization, apikey, content-type, x-client-info','access-control-max-age':'600','vary':'Origin'}:{'vary':'Origin'};};
Deno.serve(async req=>{
 const respond=(status,body)=>new Response(JSON.stringify(body),{status,headers:{...headers,...corsFor(req)}});
 if(req.method==='OPTIONS')return ALLOWED_ORIGINS.has(req.headers.get('origin')||'')?new Response(null,{status:204,headers:corsFor(req)}):respond(403,{error:'origin_not_allowed'});
 if(req.method!=='POST')return respond(405,{error:'method_not_allowed'});
 let url;try{url=new URL(req.url)}catch{return respond(400,{error:'invalid_request'})}
 if(url.pathname.split('/').pop()!=='decide'||url.search)return respond(404,{error:'not_found'});
 const authHeader=req.headers.get('authorization');
 if(typeof authHeader!=='string'||!/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(authHeader))return respond(401,{error:'user_bearer_required'});
 if(!(req.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))return respond(415,{error:'json_required'});
 const length=Number(req.headers.get('content-length')||'0');
 if(!Number.isFinite(length)||length>MAX_BODY)return respond(413,{error:'body_too_large'});
 const raw=await req.text().catch(()=>null);
 if(raw===null||raw.length>MAX_BODY)return respond(413,{error:'body_too_large'});
 let payload;try{payload=validateBody(JSON.parse(raw))}catch{}
 if(!payload)return respond(400,{error:'invalid_decision_payload'});

 const host='https://'+STAGING_PROJECT+'.supabase.co';
 const anon=Deno.env.get('SUPABASE_ANON_KEY');
 const db=Deno.env.get('SUPABASE_DB_URL');
 if(Deno.env.get('SUPABASE_URL')!==host||!anon||!db)return respond(503,{error:'staging_not_configured'});
 const auth=createClient(host,anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const token=authHeader.slice(7);
 let user;
 try{
  const result=await auth.auth.getUser(token);
  if(result.error||!isValidIdentity(result.data?.user))return respond(401,{error:'verified_user_required'});
  user=result.data.user;
 }catch{return respond(401,{error:'verified_user_required'})}
 const claims=decodeVerifiedJwtPayload(token);
 if(!matchesVerifiedSessionClaims(claims,user))return respond(401,{error:'verified_session_required'});

 const sql=postgres(db,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 try{
   const decisionId=await sql.begin(async tx=>{
     const access=await tx`
        select exists (
         select 1 from auth.sessions s
          where s.id=${claims.session_id}::uuid and s.user_id=${user.id}::uuid
           and (s.not_after is null or s.not_after>now())
        ) as live,
        exists (
         select 1 from proofline_private.memberships m
          join auth.users u on u.id=m.auth_user_id
          where m.tenant_id=${STAGING_TENANT}::uuid and m.auth_user_id=${user.id}::uuid
           and m.issuer=${ISSUER} and m.subject=${user.id}
           and m.role='reviewer' and m.active=true
           and u.is_anonymous=false and u.email_confirmed_at is not null
           and (u.banned_until is null or u.banned_until<=now())
        ) as allowed,
        exists (
          select 1 from proofline_private.report_artifacts a
          where a.id=${payload.artifact_id}::uuid
            and a.tenant_id=${STAGING_TENANT}::uuid
            and a.source_sha256=${payload.expected_sha256}
            and a.classification='SYNTHETIC_STAGING_ONLY'
            and a.status='draft' and not a.customer_delivery_allowed
        ) as artifact_allowed`;
     if(access.length!==1||access[0].live!==true||access[0].allowed!==true||access[0].artifact_allowed!==true)return null;
     const rows=await tx`select proofline_private.record_staging_review_decision_v1(
       ${payload.artifact_id}::uuid,${user.id}::uuid,${claims.session_id}::uuid,
       ${payload.expected_sha256},${payload.decision},${payload.rationale.trim()}
      ) as decision_id`;
     return rows[0]?.decision_id??null;
   });
   if(!decisionId)return respond(403,{error:'reviewer_session_or_artifact_not_authorized'});
   return respond(201,{decision_id:decisionId,status:'recorded',decision:payload.decision,classification:'SYNTHETIC_STAGING_ONLY',customer_delivery_allowed:false});
 }catch(e){
   const code=String(e?.code||'');
   if(code==='23505')return respond(409,{error:'decision_already_recorded'});
   if(code==='42501'||code==='23514'||code==='23503')return respond(403,{error:'reviewer_session_or_artifact_not_authorized'});
   return respond(503,{error:'review_decision_unavailable'});
 }finally{await sql.end({timeout:2}).catch(()=>{})}
});
