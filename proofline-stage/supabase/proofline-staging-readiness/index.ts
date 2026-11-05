import postgres from 'npm:postgres@3.4.7';
const PROJECT='pgknyzwctmfqvlivlgpe';
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY','content-security-policy':"default-src 'none'; frame-ancestors 'none'"};
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
const encoder=new TextEncoder();
async function equalSecret(a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length<20||b.length<20||a.length>8192||b.length>8192)return false;
 const [x,y]=await Promise.all([crypto.subtle.digest('SHA-256',encoder.encode(a)),crypto.subtle.digest('SHA-256',encoder.encode(b))]);
 const p=new Uint8Array(x),q=new Uint8Array(y);let diff=0;
 for(let i=0;i<p.length;i++)diff|=p[i]^q[i];
 return diff===0;
}
Deno.serve(async(req)=>{
 if(req.method!=='GET')return reply(405,{error:'method_not_allowed'});
 let u;try{u=new URL(req.url)}catch{return reply(400,{error:'bad_request'})}
 if(u.pathname.split('/').pop()!=='status'||u.search)return reply(404,{error:'not_found'});
 const expectedUrl=`https://${PROJECT}.supabase.co`;
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const dbUrl=Deno.env.get('SUPABASE_DB_URL');
 if(Deno.env.get('SUPABASE_URL')!==expectedUrl||!key||!dbUrl)return reply(503,{error:'staging_not_configured'});
 const bearer=req.headers.get('authorization');
 if(!bearer||!bearer.startsWith('Bearer ')||!await equalSecret(bearer.slice(7),key))return reply(403,{error:'admin_only'});
 const sql=postgres(dbUrl,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 try{
   const checks=await sql`select check_name,passed,observed from proofline_private.staging_release_preflight_v1() order by check_name`;
   if(checks.length!==9||checks.some(c=>typeof c.check_name!=='string'||typeof c.passed!=='boolean'))
     return reply(503,{error:'preflight_contract_unavailable'});
   const results=checks.map(c=>({name:c.check_name,passed:c.passed,observed:c.observed}));
   const ready=results.every(c=>c.passed);
   return reply(200,{project:'proofline-assurance-staging',release_ready:ready,passed:results.filter(c=>c.passed).length,total:results.length,checks:results});
 }catch{return reply(503,{error:'preflight_unavailable'})}
 finally{await sql.end({timeout:2}).catch(()=>{})}
});
