import postgres from 'npm:postgres@3.4.7';
const PROJECT='pgknyzwctmfqvlivlgpe',ROOT='https://proofline-assurance-staging.vercel.app';
const reply=(status,payload)=>new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const request=async (path)=>{
 const start=performance.now();
 try{
  const response=await fetch(ROOT+path,{method:'GET',headers:{accept:path==='/'?'text/html':'*/*'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
  const body=await response.text();
  return {path,status:response.status,ms:Math.round(performance.now()-start),type:response.headers.get('content-type')||'',
    csp:response.headers.get('content-security-policy')||'',body};
 }catch{return {path,status:0,ms:Math.round(performance.now()-start),type:'',csp:'',body:''}}
};
const evidence=(r)=>({path:r.path,status:r.status,ms:r.ms,content_type:r.type,bytes:r.body.length});
const summary=(list)=>{const vals=list.map(x=>x.ms).sort((a,b)=>a-b);return {
 concurrency:list.length,requests:list.length,failures:list.filter(r=>r.status!==200).length,
 average_ms:Math.round(vals.reduce((a,b)=>a+b,0)/vals.length),
 p95_ms:vals[Math.ceil(vals.length*.95)-1],max_ms:vals[vals.length-1]
}};
Deno.serve(async req=>{
 if(req.method!=='POST')return reply(405,{error:'method_not_allowed'});
 let url;try{url=new URL(req.url)}catch{return reply(400,{error:'bad_url'})}
 if(url.pathname.split('/').pop()!=='proofline-frontend-smoke'||url.search)return reply(404,{error:'not_found'});
 const db=Deno.env.get('SUPABASE_DB_URL');
 if(!db||Deno.env.get('SUPABASE_URL')!=='https://'+PROJECT+'.supabase.co')return reply(503,{error:'staging_not_configured'});
 if(!req.headers.get('content-type')?.startsWith('application/json'))return reply(415,{error:'json_required'});
 const raw=await req.text().catch(()=>null);
 if(!raw||raw.length>512)return reply(400,{error:'invalid_body'});
 let input;try{input=JSON.parse(raw)}catch{return reply(400,{error:'invalid_json'})}
 if(!input||typeof input!=='object'||Object.keys(input).sort().join(',')!=='ticket_id,token'
  ||typeof input.ticket_id!=='string'||!ID.test(input.ticket_id)
  ||typeof input.token!=='string'||!/^[0-9a-f]{64}$/.test(input.token))
 return reply(400,{error:'invalid_ticket'});
 const sql=postgres(db,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 let claimed=false,results={checks:[],phases:[],requests:[],passed:false,scope:'STATIC_STAGING_ONLY',production_release_eligible:false};
 try{
  const rows=await sql`update proofline_private.frontend_smoke_runs set status='running',started_at=clock_timestamp()
    where ticket_id=${input.ticket_id}::uuid and status='pending' and expires_at>clock_timestamp()
    and token_sha256=encode(extensions.digest(convert_to(${input.token},'UTF8'),'sha256'),'hex')
    returning ticket_id`;
  if(rows.length!==1)return reply(403,{error:'invalid_or_consumed_ticket'});
  claimed=true;input.token='';
  const main=await request('/');
  results.requests.push(evidence(main));
  results.checks.push({name:'html_document',passed:main.status===200&&main.type.includes('text/html')&&main.body.includes('Assessment review workbench')});
  results.checks.push({name:'viewport',passed:main.body.includes('name="viewport"')});
  results.checks.push({name:'skip_navigation',passed:main.body.includes('Skip to main content')&&main.body.includes('id=main-content')});
  results.checks.push({name:'csp',passed:main.csp.includes("default-src 'none'")&&main.csp.includes("script-src 'self'")&&main.csp.includes("frame-ancestors 'none'")});
  results.checks.push({name:'customer_release_locked',passed:main.body.includes('Release locked')&&main.body.includes('INTERNAL TEST ONLY')});
  const assets=await Promise.all([request('/styles.css'),request('/workbench.js'),request('/?utm_source=proofline-smoke')]);
  for(const a of assets)results.requests.push(evidence(a));
  const css=assets[0],js=assets[1],utm=assets[2];
  results.checks.push({name:'css_loaded',passed:css.status===200&&css.type.includes('text/css')});
  results.checks.push({name:'css_mobile',passed:css.body.includes('@media(max-width:700px)')});
  results.checks.push({name:'css_keyboard_focus',passed:css.body.includes('focus-visible')});
  results.checks.push({name:'css_reduced_motion',passed:css.body.includes('prefers-reduced-motion')});
  results.checks.push({name:'script_loaded',passed:js.status===200&&js.type.includes('javascript')&&js.body.includes('proofline-staging-review-report')});
  results.checks.push({name:'no_public_registration',passed:!js.body.includes('/auth/v1/signup')&&!js.body.includes('checkout.stripe.com')});
  results.checks.push({name:'utm_document',passed:utm.status===200&&utm.type.includes('text/html')});
  if(results.checks.every(x=>x.passed)){
   for(const n of [1,3,5]){
    const batch=await Promise.all(Array.from({length:n},()=>request('/')));
    for(const a of batch)results.requests.push(evidence(a));
    results.phases.push(summary(batch));
   }
  }
  results.passed=results.checks.every(x=>x.passed)&&results.phases.length===3
   &&results.phases.every(p=>p.failures===0&&p.p95_ms<1500);
 }catch(e){
  results.checks.push({name:'probe_exception',passed:false});
  results.passed=false;
 }finally{
  if(claimed){
   try{await sql`update proofline_private.frontend_smoke_runs set status=${results.passed?'passed':'failed'},
      finished_at=clock_timestamp(),results=${JSON.stringify(results)}::text::jsonb
      where ticket_id=${input.ticket_id}::uuid and status='running'`;}catch{}
  }
  try{await sql.end({timeout:2})}catch{}
 }
 return reply(results.passed?200:409,{ticket_id:input.ticket_id,passed:results.passed,
  checks:results.checks,phases:results.phases,requests:results.requests,production_release_eligible:false});
});
