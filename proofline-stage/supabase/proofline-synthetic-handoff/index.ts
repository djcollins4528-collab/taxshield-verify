import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
import postgres from 'npm:postgres@3.4.7';
import {STAGING_PROJECT,STAGING_TENANT,ISSUER,decodeVerifiedJwtPayload,matchesVerifiedSessionClaims} from '../proofline-staging-auth/policy.mjs';
import {packageText} from './package.mjs';

const host='https://'+STAGING_PROJECT+'.supabase.co';
const bucket='proofline-synthetic-handoffs';
const packageId='72dc93cf-0011-4531-b54a-69ebccb244ac';
const issuer='a052989c-9949-4ea6-a102-190170c870ac';
const recipient='b6c3230a-e242-421c-9fd1-8146519182ec';
const objectPath=packageId+'/'+recipient+'/package.json';
const markerPath=packageId+'/withdrawn.json';
const headers={'cache-control':'private, no-store, max-age=0','x-content-type-options':'nosniff','content-type':'application/json'};
const reply=(status:number,body:object)=>new Response(JSON.stringify(body),{status,headers});
const denied=()=>reply(403,{error:'handoff_access_denied'});
const unavailable=()=>reply(503,{error:'handoff_unavailable'});

Deno.serve(async request=>{
 const url=new URL(request.url);
 const parts=url.pathname.split('/');
 const action=parts.pop();
 if(parts.pop()!==packageId||url.search||!['issue','package','withdraw'].includes(action??''))return reply(404,{error:'unknown_handoff'});
 if(request.method!==(action==='package'?'GET':'POST'))return reply(405,{error:'method_denied'});
 if(request.body){
  const reader=request.body.getReader();
  const {done}=await reader.read();
  if(!done){await reader.cancel();return reply(400,{error:'unexpected_body'});}
 }
 const bearer=request.headers.get('authorization')??'';
 if(!/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(bearer))return reply(401,{error:'sign_in_required'});
 const anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),db=Deno.env.get('SUPABASE_DB_URL');
 if(Deno.env.get('SUPABASE_URL')!==host||!anon||!service||!db)return unavailable();
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const auth=createClient(host,anon,options);
 const sql=postgres(db,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 try{
  const token=bearer.slice(7);
  const {data,error}=await auth.auth.getUser(token);
  const claims=decodeVerifiedJwtPayload(token);
  if(error||!matchesVerifiedSessionClaims(claims,data.user))return reply(401,{error:'invalid_session'});
  const isRead=action==='package';
  const subject=isRead?recipient:issuer;
  if(data.user?.id!==subject)return denied();
  const allowed=await sql`SELECT 1 FROM proofline_private.memberships m JOIN auth.users u ON u.id=m.auth_user_id
   JOIN auth.sessions s ON s.user_id=u.id WHERE m.tenant_id=${STAGING_TENANT}::uuid AND m.active
   AND m.issuer=${ISSUER} AND m.subject=u.id::text AND u.id=${subject}::uuid AND m.role=${isRead?'reviewer':'collector'}
   AND u.is_anonymous IS FALSE AND u.deleted_at IS NULL AND u.email_confirmed_at IS NOT NULL
   AND (u.banned_until IS NULL OR u.banned_until<=now()) AND s.id=${claims.session_id}::uuid
   AND (s.not_after IS NULL OR s.not_after>now())`;
  if(allowed.length!==1)return denied();

  // The stored package is the single-use grant. Its permanent withdrawal marker wins on every read.
  const [state]=await sql`SELECT (SELECT public FROM storage.buckets WHERE id=${bucket}) AS public_bucket,
   EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id=${bucket} AND name=${objectPath}) AS issued,
   EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id=${bucket} AND name=${objectPath} AND created_at>now()-interval '10 minutes') AS fresh,
   EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id=${bucket} AND name=${markerPath}) AS withdrawn`;
  if(state.public_bucket===true)return unavailable();
  const storage=createClient(host,service,options).storage;
  const files=storage.from(bucket);
  if(action==='issue'){
   if(state.issued||state.withdrawn)return reply(409,{error:'handoff_already_used'});
   if(state.public_bucket===null){
    const result=await storage.createBucket(bucket,{public:false,fileSizeLimit:4096,allowedMimeTypes:['application/json']});
    if(result.error)return unavailable();
   }
   const result=await files.upload(objectPath,new TextEncoder().encode(packageText),{contentType:'application/json',cacheControl:'0',upsert:false});
   if(result.error)return unavailable();
   return reply(201,{issued:true,package_id:packageId,expires_in_seconds:600});
  }
  if(action==='withdraw'){
   if(!state.issued)return reply(409,{error:'handoff_unissued'});
   if(!state.withdrawn){
    const result=await files.upload(markerPath,new TextEncoder().encode(JSON.stringify({package_id:packageId,withdrawn_by:issuer})),{contentType:'application/json',cacheControl:'0',upsert:false});
    if(result.error)return unavailable();
   }
   return reply(200,{withdrawn:true,package_id:packageId});
  }
  if(state.public_bucket!==false||!state.fresh||state.withdrawn)return denied();
  const result=await files.download(objectPath);
  if(result.error||!result.data)return unavailable();
  const bytes=new Uint8Array(await result.data.arrayBuffer());
  const expected=new TextEncoder().encode(packageText);
  if(bytes.length!==expected.length||!bytes.every((byte,i)=>byte===expected[i]))return unavailable();
  return new Response(bytes,{status:200,headers:{...headers,'content-disposition':'attachment; filename="proofline-synthetic-package.json"'}});
 }catch{return unavailable();}
 finally{await sql.end({timeout:2}).catch(()=>{});}
});
