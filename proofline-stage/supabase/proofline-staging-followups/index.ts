import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
import postgres from 'npm:postgres@3.4.7';
import {STAGING_PROJECT} from './policy.mjs';
import {createHandler} from './handler.mjs';
import {runFollowup} from './database.mjs';
const host=`https://${STAGING_PROJECT}.supabase.co`;
Deno.serve(createHandler({
 configured:()=>Deno.env.get('SUPABASE_URL')===host&&!!Deno.env.get('SUPABASE_ANON_KEY')&&!!Deno.env.get('SUPABASE_DB_URL'),
 authenticate:async token=>{
  const auth=createClient(host,Deno.env.get('SUPABASE_ANON_KEY'),{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const result=await auth.auth.getUser(token);
  return result.error?null:result.data?.user;
 },
 run:async(route,payload,identity)=>{
  const sql=postgres(Deno.env.get('SUPABASE_DB_URL'),{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
  try{return await runFollowup(sql,route,payload,identity);}
  finally{await sql.end({timeout:2}).catch(()=>{});}
 }
}));
