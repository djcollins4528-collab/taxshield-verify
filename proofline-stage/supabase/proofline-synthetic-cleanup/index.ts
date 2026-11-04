import postgres from 'npm:postgres@3.4.7';
import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
const PROJECT='pgknyzwctmfqvlivlgpe',ROOT='https://'+PROJECT+'.supabase.co';
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store, private','x-content-type-options':'nosniff'};
const respond=(status,body)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
Deno.serve(async req=>{
 if(req.method!=='POST')return respond(405,{error:'method_not_allowed'});
 const url=new URL(req.url);
 if(url.pathname.split('/').pop()!=='proofline-synthetic-cleanup'||url.search)return respond(404,{error:'not_found'});
 if(!req.headers.get('content-type')?.startsWith('application/json'))return respond(415,{error:'json_required'});
 const db=Deno.env.get('SUPABASE_DB_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!db||!key||Deno.env.get('SUPABASE_URL')!==ROOT)return respond(503,{error:'staging_not_configured'});
 const raw=await req.text().catch(()=>null);
 if(!raw||raw.length>400)return respond(400,{error:'invalid_request'});
 let body;try{body=JSON.parse(raw)}catch{return respond(400,{error:'invalid_json'})}
 if(!body||Array.isArray(body)||Object.keys(body).sort().join(',')!=='ticket_id,token'
   ||typeof body.ticket_id!=='string'||!UUID.test(body.ticket_id)
   ||typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))
   return respond(400,{error:'invalid_request'});
 const sql=postgres(db,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 let claimed=false,result={deleted:0,remaining:-1,errors:[]};
 try{
  const claimedRows=await sql`update proofline_private.synthetic_cleanup_tickets
    set state='running',claimed_at=clock_timestamp()
    where ticket_id=${body.ticket_id}::uuid and state='pending' and expires_at>clock_timestamp()
      and token_sha256=encode(extensions.digest(convert_to(${body.token},'UTF8'),'sha256'),'hex')
    returning ticket_id`;
  if(claimedRows.length!==1)return respond(403,{error:'invalid_or_expired_ticket'});
  claimed=true;
  body.token='';
  const users=await sql`select id,email,raw_app_meta_data from auth.users order by id`;
  if(users.length!==2)return respond(409,{error:'unexpected_user_count'});
  let roles=new Set();
  for(const u of users){
   const m=u.raw_app_meta_data,role=m?.proofline_test_role;
   if(m?.proofline_test_identity!==true||m?.proofline_environment!=='staging'
     ||!['reviewer','collector'].includes(role)
     ||!new RegExp('^proofline-'+role+'-[a-f0-9]{14}@example[.]com$').test(u.email||''))
      return respond(409,{error:'unexpected_identity'});
   roles.add(role);
  }
  if(roles.size!==2)return respond(409,{error:'unexpected_role_inventory'});
  const check=await sql`select
     (select count(*)::integer from proofline_private.memberships where active) active,
     (select count(*)::integer from proofline_private.report_review_decisions) decisions,
     (select count(*)::integer from proofline_private.report_artifacts where reviewer_user_id is not null) reviewed_artifacts`;
  if(check[0].active!==0||check[0].decisions!==0||check[0].reviewed_artifacts!==0)return respond(409,{error:'referenced_or_active_identities'});
  const admin=createClient(ROOT,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  for(const user of users){
    const {error}=await admin.auth.admin.deleteUser(user.id);
    if(error){const code=String(error.code||error.name||'unknown').slice(0,60);
      result.errors.push({role:user.raw_app_meta_data.proofline_test_role,code,status:error.status||0});
    }else result.deleted++;
  }
  const state=await sql`select
     (select count(*)::integer from auth.users) users,
     (select count(*)::integer from auth.sessions) sessions,
     (select count(*)::integer from proofline_private.memberships where active) active_memberships`;
  result.remaining=state[0].users;result.sessions=state[0].sessions;
  result.active_memberships=state[0].active_memberships;
 }catch(e){result.errors.push({role:'system',code:String(e?.code||e?.name||'unknown').slice(0,60),status:0})}
 finally{
  if(claimed){
   try{await sql`update proofline_private.synthetic_cleanup_tickets
      set state=${result.remaining===0&&result.sessions===0&&result.errors.length===0?'succeeded':'failed'},
       finished_at=clock_timestamp(),
       sanitized_result=${JSON.stringify(result)}::jsonb
      where ticket_id=${body.ticket_id}::uuid and state='running'`;}
   catch(e){console.error('cleanup_result_store_failure',{code:String(e?.code||'unknown')})}
  }
  try{await sql.end({timeout:2})}catch{}
 }
 return respond(result.remaining===0&&result.sessions===0&&result.errors.length===0?200:409,
   {ticket_id:body.ticket_id,...result,production_release_eligible:false});
});
