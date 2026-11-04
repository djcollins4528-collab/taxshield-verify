
(()=>{
'use strict';
const PROJECT='pgknyzwctmfqvlivlgpe',ROOT='https://'+PROJECT+'.supabase.co';
const KEY="sb_publishable_JInBFXehTue8SgL_3a8glg_0RDL1PLk",ARTIFACT='7aca4913-3869-4d47-932a-699ac060af76';
const el=id=>document.getElementById(id);
const state={token:null,user:null,artifact:null,loading:false};
el('artifactId').textContent=ARTIFACT;
const endpoint={login:ROOT+'/auth/v1/token?grant_type=password',signout:ROOT+'/auth/v1/logout',
 read:ROOT+'/functions/v1/proofline-staging-review-report/report?artifact_id='+encodeURIComponent(ARTIFACT),
 decide:ROOT+'/functions/v1/proofline-staging-review-decisions/decide'};
function status(message,kind){const node=el('status');node.setAttribute('role',kind==='danger'?'alert':'status');node.setAttribute('aria-live',kind==='danger'?'assertive':'polite');node.textContent=message;node.className=kind?'notice '+kind:'notice';}
function clearStatus(){el('status').className='notice hide';el('status').textContent='';}
function setBusy(b){state.loading=b;for(const id of ['signinButton','signoutButton','loadButton','submitDecision'])el(id).disabled=b;}
function display(node,text){node.textContent=String(text??'Not recorded');}
function paragraph(container,text,cls){const p=document.createElement('p');if(cls)p.className=cls;display(p,text);container.appendChild(p);}
function renderCards(containerId,items,kind){const c=el(containerId);c.replaceChildren();for(const item of (Array.isArray(items)?items.slice(0,20):[])){
 const box=document.createElement('div');box.className='panel';
 const h=document.createElement('h3');display(h,kind==='finding'?item.finding_id+' · '+item.title:item.action);box.appendChild(h);
 paragraph(box,kind==='finding'?'Severity: '+item.severity+' | Result: '+item.result:'Status: '+item.status+' | Owner: '+item.owner_role,'muted');
 paragraph(box,kind==='finding'?item.observation:'Finding reference: '+item.finding_id);
 if(kind==='finding')paragraph(box,'Remediation: '+item.remediation);
 c.appendChild(box);
 }}
function reviewUI(data){
 const report=data?.report;
 if(!report||report.classification!=='SYNTHETIC_STAGING_ONLY'||data.classification!=='SYNTHETIC_STAGING_ONLY'||data.customer_delivery_allowed!==false||data.approval_allowed!==false)throw Error('Report contract invalid');
 if(report.report_status!=='DRAFT_NOT_APPROVED'||report.customer_deliverable!==false||report.review?.sign_off_status!=='NOT_SIGNED')throw Error('Report cannot be reviewed in this workbench');
 state.artifact=data;
 display(el('headline'),report.executive_summary?.headline);display(el('summary'),report.executive_summary?.narrative);display(el('fingerprint'),data.source_sha256);
 renderCards('findings',report.findings,'finding');renderCards('remediations',report.remediation_plan,'remediation');
 el('decisionStatus').textContent=data.decision_recorded?'A decision has already been recorded: '+String(data.decision):'No decision recorded yet. Only rejection or change request is permitted.';
 el('decisionForm').classList.toggle('hide',data.decision_recorded===true);
 el('reportArea').classList.remove('hide');
}
function reset(){
 state.token=null;state.user=null;state.artifact=null;
 el('reviewPanel').classList.add('hide');el('reportArea').classList.add('hide');el('loginPanel').classList.remove('hide');
 el('password').value='';el('rationale').value='';el('findings').replaceChildren();el('remediations').replaceChildren();
}
async function request(url,init){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
 const res=await fetch(url,{...init,signal:controller.signal,cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'});
 if(!res.ok){
  if(res.status===401&&url!==endpoint.login&&url!==endpoint.signout){reset();el('email').focus();throw Error('Your session expired or was revoked. Sign in again.');}
  throw Error((res.status===401||res.status===403)?'Access denied. Check confirmed account, reviewer membership, and live session.':res.status===409?'This report already has a recorded decision. Retrieve it again.':res.status===404?'Report not found.':res.status>=500?'Service unavailable. Try again shortly.':'Request failed ('+res.status+').');
 }
 if(url===endpoint.signout)return null;
 try{return await res.json()}catch{throw Error('Invalid server response. Try again shortly.')}
 }catch(err){
  if(controller.signal.aborted)throw Error('Request timed out. Check your connection and try again.');
  if(err instanceof TypeError)throw Error('Unable to reach the service. Check your connection and try again.');
  throw err;
 }finally{clearTimeout(timer)}
}
el('loginForm').addEventListener('submit',async ev=>{
 ev.preventDefault();clearStatus();setBusy(true);
 try{
  const data=await request(endpoint.login,{method:'POST',headers:{'apikey':KEY,'content-type':'application/json'},body:JSON.stringify({email:el('email').value.trim(),password:el('password').value})});
  if(typeof data.access_token!=='string'||data.access_token.length<20||!data.user?.id)throw Error('No verified session returned');
  state.token=data.access_token;state.user=data.user;el('password').value='';
  el('loginPanel').classList.add('hide');el('reviewPanel').classList.remove('hide');
  display(el('identity'),'Signed in as '+(data.user.email||'staging reviewer')+' (permissions checked on each request).');
  status('Signed in. Retrieve the report to verify reviewer access.','success');
 }catch(err){reset();status(err.message||'Unable to sign in.','danger')}
 finally{setBusy(false);if(state.token)el('loadButton').focus();else el('email').focus()}
});
el('loadButton').addEventListener('click',async()=>{
 if(!state.token)return;
 setBusy(true);clearStatus();el('reportArea').classList.add('hide');state.artifact=null;
 try{const data=await request(endpoint.read,{headers:{'apikey':KEY,'authorization':'Bearer '+state.token}});
  reviewUI(data);status('Immutable synthetic assessment retrieved and integrity-checked by the server.','success');el('reportArea').focus();
 }catch(err){status(err.message||'Report unavailable.','danger')}
 finally{setBusy(false)}
});
el('decisionForm').addEventListener('submit',async ev=>{
 ev.preventDefault();if(!state.token||!state.artifact)return;
 const decision=el('decision').value,rationale=el('rationale').value.trim();
 if(!['rejected','changes_requested'].includes(decision)||rationale.length<15||rationale.length>2000)return status('Invalid decision or rationale.','danger');
 const artifact=state.artifact;setBusy(true);clearStatus();
 try{
 const data=await request(endpoint.decide,{method:'POST',headers:{'apikey':KEY,'authorization':'Bearer '+state.token,'content-type':'application/json'},
   body:JSON.stringify({artifact_id:artifact.artifact_id,expected_sha256:artifact.source_sha256,decision,rationale})});
 if(data.status!=='recorded'||data.customer_delivery_allowed!==false)throw Error('Unexpected decision response');
 state.artifact=null;el('reportArea').classList.add('hide');
 status('Decision recorded. Retrieve the report again to verify the persisted outcome.','success');
 }catch(err){status(err.message||'Decision failed.','danger')}
 finally{setBusy(false)}
});
el('signoutButton').addEventListener('click',async()=>{
 const token=state.token;reset();setBusy(true);
 try{if(token)await request(endpoint.signout,{method:'POST',headers:{'apikey':KEY,'authorization':'Bearer '+token}});
  status('Signed out. Server sign-out confirmed; this browser has discarded its session token.','success');
 }catch{status('This browser has discarded its session token, but server sign-out could not be confirmed. Sign in again and retry sign-out; contact the staging administrator if this persists.','danger')}
 finally{setBusy(false);el('email').focus()}
});
})();
