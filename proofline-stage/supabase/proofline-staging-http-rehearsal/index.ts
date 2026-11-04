import postgres from 'npm:postgres@3.4.7';
import { createClient } from 'npm:@supabase/supabase-js@2.57.0';

const PROJECT='pgknyzwctmfqvlivlgpe',TENANT='bbbbaaaa-1111-4111-8111-000000000001';
const ROOT='https://'+PROJECT+'.supabase.co';
const HEADER={'content-type':'application/json; charset=utf-8','cache-control':'no-store, private','x-content-type-options':'nosniff','x-frame-options':'DENY'};
const respond=(status,body)=>new Response(JSON.stringify(body),{status,headers:HEADER});
const enc=new TextEncoder();

async function same(a,b) {
 if(typeof a!=='string'||typeof b!=='string'||a.length<20||b.length<20||a.length>8192||b.length>8192)return false;
 const [x,y]=await Promise.all([a,b].map(v=>crypto.subtle.digest('SHA-256',enc.encode(v))));
 const aa=new Uint8Array(x),bb=new Uint8Array(y);let diff=0;
 for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];return diff===0;
}
async function call(url,headers,method='GET',body=undefined){
 const req={method,headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)};
 if(body!==undefined)req.body=JSON.stringify(body);
 const res=await fetch(url,req);
 let json=null;try{json=await res.json()}catch{}
 return {status:res.status,json};
}
const makeHeaders=(key,token=key,extra={})=>({
 'apikey':key,'authorization':'Bearer '+token,'content-type':'application/json',...extra
});
Deno.serve(async req=>{
 if(req.method!=='POST')return respond(405,{error:'method_not_allowed'});
 let url;try{url=new URL(req.url)}catch{return respond(400,{error:'invalid_request'})}
 if(url.pathname.split('/').pop()!=='run'||url.search)return respond(404,{error:'not_found'});
 const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const anon=Deno.env.get('SUPABASE_ANON_KEY');
 const db=Deno.env.get('SUPABASE_DB_URL');
 if(Deno.env.get('SUPABASE_URL')!==ROOT||!service||!anon||!db)return respond(503,{error:'staging_not_configured'});
 const bearer=req.headers.get('authorization');
 if(!bearer?.startsWith('Bearer ')||!await same(bearer.slice(7),service))return respond(403,{error:'admin_only'});
 if(req.headers.get('x-proofline-acceptance')!=='server-observed-rehearsal-v1')return respond(403,{error:'acceptance_header_required'});
 if(!req.headers.get('content-type')?.startsWith('application/json'))return respond(415,{error:'json_required'});
 const input=await req.text().catch(()=>null);
 if(input===null||input.length>128)return respond(400,{error:'invalid_body'});
 if(input.trim()!=='{"purpose":"synthetic-http-rehearsal"}')return respond(400,{error:'explicit_rehearsal_confirmation_required'});

 const sql=postgres(db,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 const admin=createClient(ROOT,service,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 let lock=false,started=new Date().toISOString(),bootstrapAttempted=false,cleanupConfirmed=false;
 let observation=[],accounts=[],precondition=false,criticalFailure=false;
 const mark=(name,status,passed,error)=>{const check={name,status:typeof status==='number'?String(status):'000',passed:passed===true};if(typeof error==='string'&&/^[a-z_]{1,80}$/.test(error))check.error=error;observation.push(check);if(!passed)criticalFailure=true;};
 const safeCall=async(fn)=>{try{return await fn()}catch{return {status:0,json:null}}};
 const cleanup=async()=>{
   let result=await safeCall(()=>call(ROOT+'/functions/v1/proofline-staging-acceptance-control/control',
       makeHeaders(service,service,{'x-proofline-acceptance':'synthetic-stage-control-v1'}),
       'POST',{action:'cleanup'}));
   if(result.status!==200||result.json?.remaining!==0){
     // Recovery uses only the explicitly marked synthetic bootstrap identities.
     // Do not delete other accounts, even when the rehearsal fails.
     const known=accounts.filter(a=>typeof a?.user_id==='string'&&
       ['collector','reviewer'].includes(a.role));
     for(const account of known){
       try{await admin.auth.admin.deleteUser(account.user_id)}catch{}
     }
     result=await safeCall(()=>call(ROOT+'/functions/v1/proofline-staging-acceptance-control/control',
       makeHeaders(service,service,{'x-proofline-acceptance':'synthetic-stage-control-v1'}),
       'POST',{action:'cleanup'}));
   }
   return result.status===200&&result.json?.remaining===0;
 };
 try{
   const locked=await sql`select pg_try_advisory_lock(7729,4493) as acquired`;
   if(locked[0]?.acquired!==true)return respond(409,{error:'rehearsal_already_active'});
   lock=true;
   // Use PostgreSQL time for durable receipt validation, not the Edge worker clock.
   const serverClock=await sql`select clock_timestamp()::text as started_at`;
   if(serverClock.length!==1)throw Error('server_clock_unavailable');
   started=serverClock[0].started_at;
   const baseline=await safeCall(()=>call(ROOT+'/functions/v1/proofline-staging-acceptance-control/control',
        makeHeaders(service,service,{'x-proofline-acceptance':'synthetic-stage-control-v1'}),'POST',{action:'inspect'}));
   precondition=baseline.status===200&&baseline.json?.auth_users===0
     &&baseline.json?.memberships===0&&baseline.json?.decisions===0
     &&baseline.json?.synthetic_reports===1;
   mark('isolated_baseline',baseline.status,precondition);
   if(precondition){
     const origin='https://proofline-assurance-staging.vercel.app';
     const probe=async(url,method,requestedHeaders,reqOrigin=origin)=>{
       try{
         const r=await fetch(url,{method:'OPTIONS',headers:{
           'Origin':reqOrigin,
           'Access-Control-Request-Method':method,
           'Access-Control-Request-Headers':requestedHeaders
         },signal:AbortSignal.timeout(8000),redirect:'error',cache:'no-store'});
         return {status:r.status,origin:r.headers.get('access-control-allow-origin')||'',
           methods:r.headers.get('access-control-allow-methods')||'',
           headers:r.headers.get('access-control-allow-headers')||''};
       }catch{return {status:0,origin:'',methods:'',headers:''}}
     };
     const reportUrl=ROOT+'/functions/v1/proofline-staging-review-report/report';
     const decisionUrl=ROOT+'/functions/v1/proofline-staging-review-decisions/decide';
     const authUrl=ROOT+'/auth/v1/token?grant_type=password';
     const authCors=await probe(authUrl,'POST','apikey,content-type');
     mark('browser_auth_preflight',authCors.status,
       authCors.status>=200&&authCors.status<300&&
       (authCors.origin===origin||authCors.origin==='*'));
     const reportCors=await probe(reportUrl,'GET','authorization,apikey');
     mark('browser_report_preflight',reportCors.status,
       reportCors.status>=200&&reportCors.status<300&&
       reportCors.origin===origin&&reportCors.methods.includes('GET'));
     const decisionCors=await probe(decisionUrl,'POST','authorization,apikey,content-type');
     mark('browser_decision_preflight',decisionCors.status,
       decisionCors.status>=200&&decisionCors.status<300&&
       decisionCors.origin===origin&&decisionCors.methods.includes('POST'));
     const unexpectedOrigin='https://malicious-test-origin.invalid';
     const reportDenied=await probe(reportUrl,'GET','authorization,apikey',unexpectedOrigin);
     mark('report_other_origin_not_trusted',reportDenied.status,
       reportDenied.origin!==unexpectedOrigin&&reportDenied.origin!=='*');
     const decisionDenied=await probe(decisionUrl,'POST','authorization,apikey,content-type',unexpectedOrigin);
     mark('decision_other_origin_not_trusted',decisionDenied.status,
       decisionDenied.origin!==unexpectedOrigin&&decisionDenied.origin!=='*');
     bootstrapAttempted=true;
     const created=await safeCall(()=>call(ROOT+'/functions/v1/proofline-staging-auth-bootstrap/bootstrap',
       makeHeaders(service,service,{'x-proofline-acceptance':'synthetic-two-account-bootstrap'}),
       'POST',{purpose:'staging-auth-acceptance',acknowledge:'synthetic-accounts-only'}));
     if(created.status===201&&Array.isArray(created.json?.accounts))accounts=created.json.accounts;
     const collector=accounts.find(a=>a.role==='collector'),reviewer=accounts.find(a=>a.role==='reviewer');
     const provisioned=created.status===201&&accounts.length===2&&collector?.user_id&&reviewer?.user_id;
     mark('bootstrap_two_synthetic_users',created.status,!!provisioned,created.json?.error);
     if(provisioned){
       const signIn=async (a)=>safeCall(()=>call(ROOT+'/auth/v1/token?grant_type=password',
         {'apikey':anon,'content-type':'application/json'},'POST',
         {email:a.email,password:a.temporary_password}));
       const c=await signIn(collector),r=await signIn(reviewer);
       const cToken=c.json?.access_token,rToken=r.json?.access_token;
       mark('collector_password_signin',c.status,c.status===200&&typeof cToken==='string');
       mark('reviewer_password_signin',r.status,r.status===200&&typeof rToken==='string');

       const artifact=(await sql`select id,source_sha256 from proofline_private.report_artifacts
          where tenant_id=${TENANT}::uuid and classification='SYNTHETIC_STAGING_ONLY'
           and status='draft' and customer_delivery_allowed=false limit 2`);
       const uniqueArtifact=artifact.length===1;
       mark('immutable_artifact_exists',uniqueArtifact?200:404,uniqueArtifact);
       if(uniqueArtifact&&typeof rToken==='string'){
         const report=await safeCall(()=>call(
           ROOT+'/functions/v1/proofline-staging-review-report/report?artifact_id='+artifact[0].id,
           makeHeaders(anon,rToken)));
         mark('reviewer_reads_verified_draft',report.status,report.status===200
            &&report.json?.artifact_id===artifact[0].id
            &&report.json?.source_sha256===artifact[0].source_sha256
            &&report.json?.approval_allowed===false
            &&report.json?.customer_delivery_allowed===false,report.json?.error);
         const approved=await safeCall(()=>call(ROOT+'/functions/v1/proofline-staging-review-decisions/decide',
           makeHeaders(anon,rToken),'POST',{artifact_id:artifact[0].id,
              expected_sha256:artifact[0].source_sha256,decision:'approved',
              rationale:'Attempt to approve synthetic report must be denied.'}));
         mark('synthetic_approval_denied',approved.status,approved.status===400);
         const wrong=await safeCall(()=>call(ROOT+'/functions/v1/proofline-staging-review-decisions/decide',
           makeHeaders(anon,rToken),'POST',{artifact_id:artifact[0].id,
              expected_sha256:'0'.repeat(64),decision:'changes_requested',
              rationale:'A modified fingerprint must never be accepted.'}));
         mark('incorrect_report_digest_denied',wrong.status,[403,404].includes(wrong.status));
       }
       if(uniqueArtifact&&typeof cToken==='string'){
         const denied=await safeCall(()=>call(
           ROOT+'/functions/v1/proofline-staging-review-report/report?artifact_id='+artifact[0].id,
           makeHeaders(anon,cToken)));
         mark('collector_cannot_read_reviewer_report',denied.status,denied.status===403);
         const revoke=await safeCall(()=>call(ROOT+'/functions/v1/proofline-staging-acceptance-control/control',
           makeHeaders(service,service,{'x-proofline-acceptance':'synthetic-stage-control-v1'}),
           'POST',{action:'revoke',user_id:collector.user_id}));
         mark('collector_membership_revoked',revoke.status,revoke.status===200&&revoke.json?.revoked===true);
         const authCheck=await safeCall(()=>call(ROOT+'/functions/v1/proofline-staging-auth/check?tenant='+
           TENANT+'&role=collector',makeHeaders(anon,cToken)));
         mark('revoked_collector_access_denied',authCheck.status,authCheck.status===403);
       }
     }
   }
 }catch{
   criticalFailure=true;
 }finally{
   if(bootstrapAttempted)cleanupConfirmed=await cleanup();
   else cleanupConfirmed=precondition;
   if(bootstrapAttempted)mark('synthetic_account_cleanup',cleanupConfirmed?200:503,cleanupConfirmed);
   if(lock){try{await sql`select pg_advisory_unlock(7729,4493)`}catch{}}
 }
 let receipt=null,receiptError=null;
 const outcome=bootstrapAttempted&&!cleanupConfirmed?'CLEANUP_INCOMPLETE':
   (!criticalFailure&&bootstrapAttempted&&cleanupConfirmed?'PASSED_SYNTHETIC_ONLY':'FAILED');
 try{
  const rows=await sql`select proofline_private.record_http_rehearsal_v1(
   ${started}::timestamptz,${JSON.stringify(observation)}::text::jsonb,
   ${outcome},${cleanupConfirmed}) as receipt_id`;
  receipt=rows[0]?.receipt_id||null;
 }catch(e){receiptError=typeof e?.code==='string'&&/^[0-9A-Z]{5}$/.test(e.code)?e.code:'unknown'; console.error('synthetic_rehearsal_receipt_failed',{code:receiptError});}
 try{await sql.end({timeout:2})}catch{}
 return respond(outcome==='PASSED_SYNTHETIC_ONLY'?200:409,{
   outcome,receipt_id:receipt,recorded:!!receipt,receipt_error_code:receiptError,
   checks:observation,passed:observation.filter(x=>x.passed).length,total:observation.length,
   cleanup_confirmed:cleanupConfirmed,
   classification:'SYNTHETIC_STAGING_ONLY',
   client_claimed_http_check_count:null,
   production_release_eligible:false,customer_delivery_allowed:false
 });
});
