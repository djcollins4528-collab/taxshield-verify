import postgres from 'npm:postgres@3.4.7';
const PROJECT='pgknyzwctmfqvlivlgpe',ROOT='https://'+PROJECT+'.supabase.co';
const HDR={'content-type':'application/json; charset=utf-8','cache-control':'no-store, private','x-content-type-options':'nosniff','x-frame-options':'DENY'};
const json=(status,body)=>new Response(JSON.stringify(body),{status,headers:HDR});
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
Deno.serve(async request=>{
 if(request.method!=='POST')return json(405,{error:'method_not_allowed'});
 let url;try{url=new URL(request.url)}catch{return json(400,{error:'invalid_url'})}
 if(url.pathname.split('/').pop()!=='proofline-rehearsal-dispatch'||url.search)return json(404,{error:'not_found'});
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),db=Deno.env.get('SUPABASE_DB_URL');
 if(Deno.env.get('SUPABASE_URL')!==ROOT||!key||!db)return json(503,{error:'staging_not_configured'});
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json(415,{error:'json_required'});
 const raw=await request.text().catch(()=>null);
 if(!raw||raw.length>512)return json(400,{error:'invalid_request'});
 let body;try{body=JSON.parse(raw)}catch{return json(400,{error:'invalid_request'})}
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='ticket_id,token'
    ||typeof body.ticket_id!=='string'||!ID.test(body.ticket_id)
    ||typeof body.token!=='string'||!/^[0-9a-f]{64}$/.test(body.token))
    return json(400,{error:'invalid_request'});

 const sql=postgres(db,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 let claimed=false;
 try{
  const rows=await sql`update proofline_private.http_rehearsal_dispatch
   set state='running',claimed_at=clock_timestamp()
   where ticket_id=${body.ticket_id}::uuid
     and token_sha256=encode(extensions.digest(convert_to(${body.token},'UTF8'),'sha256'),'hex')
     and state='pending' and expires_at>clock_timestamp()
   returning ticket_id`;
  if(rows.length!==1)return json(403,{error:'invalid_or_consumed_dispatch_ticket'});
  claimed=true;
 }catch{return json(503,{error:'dispatch_verification_unavailable'})}

 // Never persist or return the one-time token. The administrative key stays inside
 // the Edge runtime and is used only for this fixed staging rehearsal endpoint.
 body.token='';
 let upstreamStatus=0, outcome='FAILED',receipt=null,passes=0,total=0,cleaned=false,checks=[],receiptError=null;
 try {
  const res=await fetch(ROOT+'/functions/v1/proofline-staging-http-rehearsal/run',{
    method:'POST',
    headers:{
     'Authorization':'Bearer '+key,'apikey':key,
     'Content-Type':'application/json',
     'x-proofline-acceptance':'server-observed-rehearsal-v1'
    },
    body:'{"purpose":"synthetic-http-rehearsal"}',
    cache:'no-store',redirect:'error',signal:AbortSignal.timeout(105000)
  });
  upstreamStatus=res.status;
  const b=await res.json().catch(()=>null);
  if(b && ['PASSED_SYNTHETIC_ONLY','FAILED','CLEANUP_INCOMPLETE'].includes(b.outcome)){
   outcome=b.outcome;
   receipt=typeof b.receipt_id==='string'&&ID.test(b.receipt_id)?b.receipt_id:null;
   passes=Number.isInteger(b.passed)&&b.passed>=0&&b.passed<=30?b.passed:0;
   total=Number.isInteger(b.total)&&b.total>=0&&b.total<=30?b.total:0;
   cleaned=b.cleanup_confirmed===true;
   checks=Array.isArray(b.checks)?b.checks.slice(0,30).filter(x=>typeof x?.name==='string'&&/^[a-z_]{1,64}$/.test(x.name)).map(x=>({name:x.name,status:/^[0-9]{3}$/.test(x.status)?x.status:'000',passed:x.passed===true,...(typeof x.error==='string'&&/^[a-z_]{1,80}$/.test(x.error)?{error:x.error}:{})})):[];
   receiptError=typeof b.receipt_error_code==='string'&&/^[0-9A-Z_a-z]{1,32}$/.test(b.receipt_error_code)?b.receipt_error_code:null;
  }
 }catch{}
 const passed=upstreamStatus===200&&outcome==='PASSED_SYNTHETIC_ONLY'&&cleaned&&!!receipt&&total>=7&&passes===total;
 try {
  await sql`update proofline_private.http_rehearsal_dispatch
    set state=${passed?'passed_synthetic':'failed'},
        completed_at=clock_timestamp(),
        upstream_http_status=${upstreamStatus},
        rehearsal_outcome=${outcome},
        rehearsal_receipt_id=${receipt}::uuid,
        checks_passed=${passes},checks_total=${total},
        cleanup_confirmed=${cleaned},observed_checks=${JSON.stringify(checks)}::text::jsonb,receipt_error_code=${receiptError}
    where ticket_id=${body.ticket_id}::uuid and state='running'`;
 }catch{return json(503,{error:'dispatch_result_persist_failed'})}
 finally{await sql.end({timeout:2}).catch(()=>{})}
 return json(passed?200:409,{
  ticket_id:body.ticket_id,upstream_status:upstreamStatus,outcome,
  rehearsal_receipt_id:receipt,checks_passed:passes,checks_total:total,
  cleanup_confirmed:cleaned,checks,receipt_error_code:receiptError,production_release_eligible:false
 });
});
