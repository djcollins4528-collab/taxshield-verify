import postgres from 'npm:postgres@3.4.7';
import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
const PROJECT='pgknyzwctmfqvlivlgpe',TENANT='bbbbaaaa-1111-4111-8111-000000000001';
const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY'};
const result=(status,body)=>new Response(JSON.stringify(body),{status,headers:H});
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const encoder=new TextEncoder();
async function equal(a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length<20||b.length<20||a.length>8192||b.length>8192)return false;
 const [x,y]=await Promise.all([a,b].map(v=>crypto.subtle.digest('SHA-256',encoder.encode(v))));
 let mismatch=0;const xx=new Uint8Array(x),yy=new Uint8Array(y);
 for(let i=0;i<xx.length;i++)mismatch|=xx[i]^yy[i];return mismatch===0;
}
Deno.serve(async req=>{
 if(req.method!=='POST')return result(405,{error:'method_not_allowed'});
 let route;try{route=new URL(req.url)}catch{return result(400,{error:'invalid_request'})}
 if(route.pathname.split('/').pop()!=='control'||route.search)return result(404,{error:'not_found'});
 const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),db=Deno.env.get('SUPABASE_DB_URL');
 if(Deno.env.get('SUPABASE_URL')!=='https://'+PROJECT+'.supabase.co'||!service||!db)return result(503,{error:'staging_not_configured'});
 const authorization=req.headers.get('authorization');
 if(!authorization?.startsWith('Bearer ')||!await equal(authorization.slice(7),service))return result(403,{error:'admin_only'});
 if(req.headers.get('x-proofline-acceptance')!=='synthetic-stage-control-v1')return result(403,{error:'acceptance_header_required'});
 if(!(req.headers.get('content-type')||'').startsWith('application/json'))return result(415,{error:'json_required'});
 const bodyText=await req.text().catch(()=>null);
 if(!bodyText||bodyText.length>1300)return result(400,{error:'invalid_body'});
 let body;try{body=JSON.parse(bodyText)}catch{return result(400,{error:'invalid_json'})}
 if(!body||Array.isArray(body)||typeof body!=='object')return result(400,{error:'invalid_body'});
 const action=body.action;
 if(!['inspect','revoke','record','cleanup'].includes(action))return result(400,{error:'unsupported_operation'});
 const validKeys={inspect:'action',revoke:'action,user_id',record:'action,check_count,collector_id,reviewer_id,run_id',cleanup:'action'};
 if(Object.keys(body).sort().join(',')!==validKeys[action])return result(400,{error:'invalid_arguments'});
 if(action==='revoke'&&!UUID.test(body.user_id))return result(400,{error:'invalid_id'});
 if(action==='record'&&(!UUID.test(body.collector_id)||!UUID.test(body.reviewer_id)||body.collector_id===body.reviewer_id
   ||typeof body.run_id!=='string'||!/^live-auth-[a-f0-9]{16}$/.test(body.run_id)
   ||!Number.isInteger(body.check_count)||body.check_count<12||body.check_count>100))
  return result(400,{error:'invalid_acceptance'});
 const sql=postgres(db,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 try{
  if(action==='inspect'){
   const rows=await sql`select
       (select count(*)::int from auth.users) as auth_users,
       (select count(*)::int from proofline_private.memberships) as memberships,
       (select count(*)::int from proofline_private.report_review_decisions) as decisions,
       (select count(*)::int from proofline_private.report_artifacts where tenant_id=${TENANT}::uuid and status='draft' and classification='SYNTHETIC_STAGING_ONLY' and not customer_delivery_allowed) as synthetic_reports,
       (select count(*)::int from proofline_private.staging_release_preflight_v1() where passed) as readiness_passed`;
   return result(200,{project:'proofline-assurance-staging',...rows[0]});
  }
  if(action==='revoke'){
   const rows=await sql.begin(async tx=>{
     const u=await tx`select u.id from auth.users u
       join proofline_private.memberships m on m.auth_user_id=u.id
       where u.id=${body.user_id}::uuid and m.tenant_id=${TENANT}::uuid
       and m.role='collector' and m.active
       and u.raw_app_meta_data->>'proofline_test_identity'='true'
       and u.raw_app_meta_data->>'proofline_environment'='staging'
       and u.email like 'proofline-collector-%@example.com'`;
     if(u.length!==1)return [];
     return await tx`select proofline_private.revoke_staging_member_v1(${body.user_id}::uuid) as revoked`;
   });
   if(rows[0]?.revoked!==true)return result(403,{error:'not_an_active_synthetic_collector'});
   return result(200,{revoked:true,classification:'SYNTHETIC_STAGING_ONLY'});
  }
  if(action==='cleanup'){
   const users=await sql`select id,email,raw_app_meta_data from auth.users order by id`;
   if(users.length>2)return result(409,{error:'unrecognized_staging_auth_state'});
   for(const u of users){
     const role=u.raw_app_meta_data?.proofline_test_role;
     if(u.raw_app_meta_data?.proofline_test_identity!==true||
        u.raw_app_meta_data?.proofline_environment!=='staging'||
        !['collector','reviewer'].includes(role)||
        !new RegExp('^proofline-'+role+'-[a-f0-9]{14}@example[.]com$').test(u.email||''))
       return result(409,{error:'non_synthetic_identity_present'});
   }
   const state=await sql`select
      (select count(*)::int from proofline_private.report_review_decisions) as decisions,
      (select count(*)::int from proofline_private.memberships) as memberships,
      (select count(*)::int from proofline_private.memberships m
       where m.tenant_id=${TENANT}::uuid and m.auth_user_id in
       (select id from auth.users)) as valid_memberships`;
   if(state[0]?.decisions!==0||state[0]?.memberships!==state[0]?.valid_memberships)
      return result(409,{error:'cleanup_refused_due_to_non_test_state'});
   const client=createClient('https://'+PROJECT+'.supabase.co',service,
     {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
   for(const u of users){
      const {error}=await client.auth.admin.deleteUser(u.id);
      if(error)return result(503,{error:'synthetic_identity_cleanup_failed'});
   }
   const remainder=await sql`select count(*)::int as n from auth.users`;
   if(remainder[0]?.n!==0)return result(503,{error:'synthetic_identity_cleanup_incomplete'});
   return result(200,{cleaned:users.length,remaining:0,production_release_eligible:false});
  }
  if(action==='record'){
    try {
      const rows=await sql`select proofline_private.record_synthetic_acceptance_observation_v1(
        ${body.run_id}, ${body.collector_id}::uuid, ${body.reviewer_id}::uuid,
        ${body.check_count}::integer) as run_id`;
      if(rows.length!==1||rows[0].run_id!==body.run_id)return result(503,{error:'synthetic_receipt_unavailable'});
      return result(201,{
        recorded:true,
        run_id:rows[0].run_id,
        evidence_scope:'DATABASE_OBSERVED_ONLY',
        client_claimed_check_count:body.check_count,
        http_assertions_independently_verified:false,
        production_release_eligible:false
      });
    }catch(e){
      if(String(e?.code)==='23505')return result(409,{error:'run_already_recorded'});
      if(['42501','22023','23514'].includes(String(e?.code)))return result(409,{error:'database_observations_not_satisfied'});
      return result(503,{error:'synthetic_receipt_unavailable'});
    }
  }
 }catch{return result(503,{error:'staging_control_unavailable'})}
 finally{await sql.end({timeout:2}).catch(()=>{})}
});
