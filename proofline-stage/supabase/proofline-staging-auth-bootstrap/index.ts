import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
import postgres from 'npm:postgres@3.4.7';

const PROJECT='pgknyzwctmfqvlivlgpe';
const PROJECT_URL='https://'+PROJECT+'.supabase.co';
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store, private','pragma':'no-cache','x-content-type-options':'nosniff','x-frame-options':'DENY','content-security-policy':"default-src 'none'; frame-ancestors 'none'"};
const respond=(code,value)=>new Response(JSON.stringify(value),{status:code,headers:HEADERS});
const enc=new TextEncoder();
async function secureEqual(a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length<20||b.length<20||a.length>8192||b.length>8192)return false;
 const hashes=await Promise.all([a,b].map(v=>crypto.subtle.digest('SHA-256',enc.encode(v))));
 const x=new Uint8Array(hashes[0]),y=new Uint8Array(hashes[1]);let diff=0;
 for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;
}
function secret(){
 const bytes=new Uint8Array(36);crypto.getRandomValues(bytes);
 return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
Deno.serve(async req=>{
 if(req.method!=='POST')return respond(405,{error:'method_not_allowed'});
 let route;try{route=new URL(req.url)}catch{return respond(400,{error:'invalid_request'})}
 if(route.pathname.split('/').pop()!=='bootstrap'||route.search)return respond(404,{error:'not_found'});
 const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const anon=Deno.env.get('SUPABASE_ANON_KEY');
 const databaseUrl=Deno.env.get('SUPABASE_DB_URL');
 if(Deno.env.get('SUPABASE_URL')!==PROJECT_URL||!serviceKey||!anon||!databaseUrl)return respond(503,{error:'staging_not_configured'});
 const bearer=req.headers.get('authorization');
 if(!bearer?.startsWith('Bearer ')||!await secureEqual(bearer.slice(7),serviceKey))return respond(403,{error:'admin_only'});
 if(req.headers.get('x-proofline-acceptance')!=='synthetic-two-account-bootstrap')return respond(403,{error:'explicit_acceptance_header_required'});
 if(!(req.headers.get('content-type')||'').startsWith('application/json'))return respond(415,{error:'json_required'});
 if(Number(req.headers.get('content-length')||0)>512)return respond(413,{error:'body_too_large'});
 let body;
 try{body=await req.json()}catch{return respond(400,{error:'body_json_unreadable'})}
 if(JSON.stringify(body).length>512)return respond(413,{error:'body_too_large'});
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='acknowledge,purpose'||body.purpose!=='staging-auth-acceptance'||body.acknowledge!=='synthetic-accounts-only')
  return respond(400,{error:'invalid_bootstrap_confirmation'});

 const admin=createClient(PROJECT_URL,serviceKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const sql=postgres(databaseUrl,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 let lock=false,users=[],enrolled=false;
 try{
  const l=await sql`select pg_try_advisory_lock(7729,4491) as acquired`;
  if(l[0]?.acquired!==true)return respond(409,{error:'bootstrap_already_running'});
  lock=true;
  const state=await sql`select
    (select count(*)::int from auth.users) as users,
    (select count(*)::int from proofline_private.memberships) as members,
    (select count(*)::int from proofline_private.report_review_decisions) as decisions,
    (select count(*)::int from proofline_private.tenants
      where id='bbbbaaaa-1111-4111-8111-000000000001'::uuid and environment='staging') as tenant_count`;
  if(state[0]?.users!==0||state[0]?.members!==0||state[0]?.decisions!==0||state[0]?.tenant_count!==1)
   return respond(409,{error:'bootstrap_requires_empty_isolated_staging_auth'});
  const suffix=crypto.randomUUID().replace(/-/g,'').slice(0,14);
  for(const role of ['collector','reviewer']){
   const email='proofline-'+role+'-'+suffix+'@example.com';
   const password=secret();
   const {data,error}=await admin.auth.admin.createUser({
      email,password,email_confirm:true,
      app_metadata:{proofline_test_identity:true,proofline_test_role:role,proofline_environment:'staging'},
      user_metadata:{}
   });
   if(error||!data?.user?.id)throw Error('auth_user_creation_failed');
   users.push({role,user_id:data.user.id,email,password});
  }
  await sql.begin(async tx=>{
   for(const u of users){
     await tx`select proofline_private.enroll_staging_member_v1(${u.user_id}::uuid,${u.role})`;
   }
  });
  enrolled=true;
  // Operator must store these one-time credentials securely. They are never persisted as plaintext.
  return respond(201,{status:'synthetic_accounts_created',
   tenant:'proofline-synthetic-db-probe',
   classification:'SYNTHETIC_STAGING_ONLY',
   real_operators:false,
   production_release_eligible:false,
   accounts:users.map(u=>({role:u.role,user_id:u.user_id,email:u.email,temporary_password:u.password})),
   next:'Run the pre-existing staging authentication and reviewer workflow tests, then revoke both test memberships and invalidate sessions. Do not use these accounts for customer work.'
  });
 }catch{
   if(!enrolled){
     // Reverse partial enrollment before trying to delete users.
     try{await sql`delete from proofline_private.memberships
        where auth_user_id in (select u.id from auth.users u
          where u.raw_app_meta_data->>'proofline_test_identity'='true'
            and u.email like 'proofline-%@example.com')`;}catch{}
     for(const u of users){
       try{await admin.auth.admin.deleteUser(u.user_id)}catch{}
     }
   }
   return respond(503,{error:'bootstrap_failed_check_staging_admin_logs_and_identity_inventory'});
 }finally{
   if(lock){try{await sql`select pg_advisory_unlock(7729,4491)`}catch{}}
   try{await sql.end({timeout:2})}catch{}
 }
});
