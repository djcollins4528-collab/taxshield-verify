import postgres from 'npm:postgres@3.4.7';
import { PDFDocument, StandardFonts, rgb, degrees } from 'npm:pdf-lib@1.17.1';

const PROJECT='pgknyzwctmfqvlivlgpe';
const PROJECT_URL='https://'+PROJECT+'.supabase.co';
const encoder=new TextEncoder();
const err=(code,name)=>new Response(JSON.stringify({error:name}),{status:code,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
async function sameSecret(a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length<20||b.length<20||a.length>8192||b.length>8192)return false;
 const [da,db]=await Promise.all([crypto.subtle.digest('SHA-256',encoder.encode(a)),crypto.subtle.digest('SHA-256',encoder.encode(b))]);
 const aa=new Uint8Array(da),bb=new Uint8Array(db);let delta=0;
 for(let i=0;i<aa.length;i++)delta|=aa[i]^bb[i];
 return delta===0;
}
const clean=(v)=>String(v??'Not recorded').replace(/[^\x20-\x7e]/g,'?').slice(0,3000);
const limit=(arr,max)=>Array.isArray(arr)?arr.slice(0,max):[];
function validDraft(d){
 return d&&d.schema_version==='1.0'&&d.document_type==='security_assessment_draft'&&
  d.classification==='SYNTHETIC_STAGING_ONLY'&&d.customer_deliverable===false&&
  d.report_status==='DRAFT_NOT_APPROVED'&&d.delivery_controls?.customer_delivery_allowed===false&&
  d.review?.sign_off_status==='NOT_SIGNED'&&
  d.executive_summary?.release_recommendation==='DO_NOT_RELEASE'&&
  Array.isArray(d.findings)&&d.findings.length>0&&d.findings.length<=20&&
  d.evidence_manifest?.classification==='SYNTHETIC_STAGING_ONLY';
}
async function buildPdf(d){
 const pdf=await PDFDocument.create();
 pdf.setTitle('Proofline | Synthetic Assessment - INTERNAL DRAFT');
 pdf.setAuthor('Proofline Assurance - Internal Staging');
 pdf.setSubject('Synthetic test fixture - NOT CUSTOMER DELIVERABLE');
 const regular=await pdf.embedFont(StandardFonts.Helvetica);
 const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const navy=rgb(.09,.17,.27),gray=rgb(.32,.37,.43),red=rgb(.76,.13,.17);
 const W=612,H=792,M=52;
 let page,y;
 function nextPage(){
   page=pdf.addPage([W,H]);y=H-68;
   page.drawRectangle({x:0,y:H-16,width:W,height:16,color:navy});
   page.drawText('PROOFLINE  /  SECURITY ASSURANCE',{x:M,y:H-43,size:9,font:bold,color:navy});
   page.drawText('SYNTHETIC - INTERNAL DRAFT - NOT APPROVED',{x:51,y:410,size:30,font:bold,color:rgb(.93,.79,.80),rotate:degrees(33),opacity:.28});
   page.drawText('STAGING ONLY  |  NOT FOR CUSTOMER DELIVERY',{x:M,y:28,size:8,font:bold,color:red});
   page.drawText(String(pdf.getPageCount()),{x:W-M-12,y:28,size:8,font:regular,color:gray});
 }
 function room(n=20){if(y-n<75)nextPage()}
 function wrap(text,font,size,maxWidth){
   const lines=[];for(const paragraph of clean(text).split('\n')){
     let line='';
     for(const word of paragraph.split(/\s+/)){
       if(!word)continue;
       const attempt=line?line+' '+word:word;
       if(font.widthOfTextAtSize(attempt,size)<=maxWidth){line=attempt;continue;}
       if(line){lines.push(line);line='';}
       let chunk='';
       for(const char of word){if(font.widthOfTextAtSize(chunk+char,size)>maxWidth&&chunk){lines.push(chunk);chunk='';}chunk+=char;}
       line=chunk;
     }
     lines.push(line);
   }
   return lines;
 }
 function line(text,{size=10,font=regular,color=gray,indent=0,space=5}={}){
   const lines=wrap(text,font,size,W-2*M-indent);
   for(const t of lines){room(size+8);page.drawText(t||' ',{x:M+indent,y,size,font,color});y-=size+5;}
   y-=space;
 }
 function section(title){room(34);y-=4;line(title.toUpperCase(),{font:bold,size:12,color:navy,space:6});page.drawLine({start:{x:M,y:y+6},end:{x:W-M,y:y+6},thickness:.5,color:rgb(.79,.82,.85)});y-=9;}
 nextPage();
 room(90);line('SYNTHETIC SECURITY ASSESSMENT',{font:bold,size:21,color:navy,space:5});
 line('INTERNAL DRAFT - NOT SIGNED - NOT A CUSTOMER SECURITY ASSESSMENT',{font:bold,size:10,color:red,space:16});
 section('Executive summary');
 line(d.executive_summary?.headline,{font:bold,size:12,color:navy});
 line(d.executive_summary?.narrative);
 line('Release decision: '+d.executive_summary?.release_recommendation,{font:bold,color:red,space:9});
 section('Assessment scope');
 line('Environment: '+d.scope?.environment+'   |   Tenant: '+d.scope?.tenant_slug);
 line('Scope: '+d.scope?.scope_name);
 line('Real customer tenant: NO');
 section('Findings');
 for(const f of d.findings){
   room(85);
   line(clean(f.finding_id)+' | '+clean(f.title),{font:bold,size:11,color:navy,space:2});
   line('Severity: '+clean(f.severity).toUpperCase()+'     Result: '+clean(f.result).toUpperCase(),{font:bold,size:9,color:gray,space:3});
   line('Observation: '+f.observation);
   line('Evidence references: '+(limit(f.evidence_references,20).map(clean).join(', ')||'None (not tested)'),{size:9,space:3});
   line('Recommended remediation: '+f.remediation);
   line('Verification criteria: '+f.verification_criteria,{size:9,space:10});
 }
 section('Remediation plan');
 for(const item of limit(d.remediation_plan,20)){
   line(clean(item.priority)+'. '+clean(item.action),{font:bold,size:10,color:navy,space:2});
   line('Owner: '+clean(item.owner_role)+'   |   Status: '+clean(item.status)+'   |   Finding: '+clean(item.finding_id),{size:9,space:8});
 }
 section('Evidence inventory');
 const v=d.evidence_manifest?.validation??{};
 line('Recorded events: '+clean(v.event_count)+'   |   Structural checks passed: '+clean(v.structural_checks_passed));
 line('Cryptographic recomputation performed: NO   |   Live authentication verified: NO',{font:bold,size:9,color:red});
 for(const e of limit(d.evidence_manifest?.events,40)){
   line('Sequence '+clean(e.sequence)+'  /  '+clean(e.event_type)+'  /  '+clean(e.role),{font:bold,size:9,color:navy,space:2});
   line('Event ID: '+clean(e.event_id),{size:9,space:1});
   line('Digest: '+clean(e.hash),{size:8,space:7});
 }
 section('Reviewer and release controls');
 line('Reviewer sign-off: '+clean(d.review?.sign_off_status),{font:bold,color:red});
 line('Customer delivery allowed: NO   |   Export eligible for customers: NO',{font:bold,size:10,color:red});
 section('Limitations');
 for(const item of limit(d.limitations,15))line('- '+clean(item),{size:9,space:5});
 return await pdf.save();
}
Deno.serve(async(req)=>{
 if(req.method!=='GET')return err(405,'method_not_allowed');
 let u;try{u=new URL(req.url)}catch{return err(400,'bad_request')}
 if(u.pathname.split('/').pop()!=='draft.pdf'||u.search)return err(404,'not_found');
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const dbUrl=Deno.env.get('SUPABASE_DB_URL');
 if(Deno.env.get('SUPABASE_URL')!==PROJECT_URL||!dbUrl||!key)return err(503,'staging_not_configured');
 const header=req.headers.get('authorization');
 if(!header?.startsWith('Bearer ')||!await sameSecret(header.slice(7),key))return err(403,'admin_only');
 const sql=postgres(dbUrl,{max:1,prepare:false,connect_timeout:5,idle_timeout:1});
 try{
   const rows=await sql`select proofline_private.synthetic_assessment_draft_v1() as draft`;
   const draft=rows[0]?.draft;
   if(!validDraft(draft))return err(503,'synthetic_draft_contract_invalid');
   const bytes=await buildPdf(draft);
   if(bytes.length>2_000_000)return err(503,'report_size_limit');
   return new Response(bytes,{status:200,headers:{
    'content-type':'application/pdf',
    'content-disposition':'attachment; filename="proofline-synthetic-assessment-DRAFT.pdf"',
    'cache-control':'no-store, private',
    'x-content-type-options':'nosniff',
    'x-frame-options':'DENY',
    'content-security-policy':"default-src 'none'; frame-ancestors 'none'",
    'content-length':String(bytes.length)
   }});
 }catch{return err(503,'draft_render_unavailable')}
 finally{await sql.end({timeout:2}).catch(()=>{})}
});
