
(()=>{
'use strict';
const PROJECT='pgknyzwctmfqvlivlgpe',ROOT='https://'+PROJECT+'.supabase.co';
const KEY="sb_publishable_JInBFXehTue8SgL_3a8glg_0RDL1PLk",ARTIFACT='7aca4913-3869-4d47-932a-699ac060af76';
const el=id=>document.getElementById(id);
const state={token:null,user:null,artifact:null,loading:false,followup:null};
el('artifactId').textContent=ARTIFACT;
const endpoint={login:ROOT+'/auth/v1/token?grant_type=password',signout:ROOT+'/auth/v1/logout',
 read:ROOT+'/functions/v1/proofline-staging-review-report/report?artifact_id='+encodeURIComponent(ARTIFACT),
 decide:ROOT+'/functions/v1/proofline-staging-review-decisions/decide',
 history:ROOT+'/functions/v1/proofline-staging-followups/history',append:ROOT+'/functions/v1/proofline-staging-followups/append'};
function status(message,kind){const node=el('status');node.setAttribute('role',kind==='danger'?'alert':'status');node.setAttribute('aria-live',kind==='danger'?'assertive':'polite');node.textContent=message;node.className=kind?'notice '+kind:'notice';}
function clearStatus(){el('status').className='notice hide';el('status').textContent='';}
function setBusy(b){state.loading=b;for(const id of ['signinButton','signoutButton','loadButton','submitDecision','historyButton','moreHistoryButton','submitFollowup','followupFinding'])el(id).disabled=b;}
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
 clearFollowup(true);
}
function clearFollowup(clearInputs=false){
 state.followup=null;el('historyArea').classList.add('hide');el('followupForm').classList.add('hide');el('moreHistoryButton').classList.add('hide');el('followupHistory').replaceChildren();
 if(clearInputs){el('followupForm').reset();el('followupStatus').textContent='';}
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const hash=/^[0-9a-f]{64}$/;
function historyUI(data,continuation){
 const previous=continuation?state.followup:null;
 if(!data||data.classification!=='SYNTHETIC_STAGING_ONLY'||data.customer_delivery_allowed!==false||data.approval_allowed!==false||data.artifact_id!==ARTIFACT||data.finding_id!==el('followupFinding').value||!hash.test(data.source_sha256)||!['collector','reviewer'].includes(data.role)||!(data.change_request_id===null||uuid.test(data.change_request_id))||!Array.isArray(data.events)||data.events.length>100)throw Error('Invalid history response. Retrieve history again.');
 if(previous&&(previous.finding_id!==data.finding_id||previous.source_sha256!==data.source_sha256||previous.role!==data.role||previous.change_request_id!==data.change_request_id))throw Error('History changed. Retrieve history again.');
 const prior=previous?.events||[],events=[...prior,...data.events];
 let last=prior.at(-1)||null;
 for(const event of data.events){
  if(!event||!uuid.test(event.id)||event.sequence!==(last?last.sequence+1:1)||event.previous_id!==(last?last.id:null)||event.finding_id!==data.finding_id||event.artifact_sha256!==data.source_sha256||event.review_decision_id!==data.change_request_id||!hash.test(event.evidence_sha256)||!['remediation','reverification'].includes(event.kind)||event.kind===(last?.kind)||(!last&&event.kind!=='remediation')||!event.evidence||event.evidence.classification!=='SYNTHETIC_STAGING_ONLY'||event.evidence.customer_data!==false||['observation','criterion','limitations'].some(k=>typeof event.evidence[k]!=='string'))throw Error('Invalid history chain. Retrieve history again.');
  if(event.kind==='remediation'?event.outcome!==null:!['PASS','FAIL','INCONCLUSIVE','NOT_TESTED','NOT_APPLICABLE'].includes(event.outcome))throw Error('Invalid retest outcome. Retrieve history again.');
  last=event;
 }
 if(data.next_after_sequence!==null&&(data.events.length!==100||data.next_after_sequence!==last?.sequence))throw Error('Invalid history cursor. Retrieve history again.');
 state.followup={...data,events};
 const list=el('followupHistory');if(!continuation)list.replaceChildren();
 for(const event of data.events){const item=document.createElement('li');paragraph(item,'Event '+event.sequence+' · '+event.kind+(event.outcome?' · '+event.outcome:''));for(const k of ['observation','criterion','limitations'])paragraph(item,k+': '+event.evidence[k]);paragraph(item,'Evidence SHA-256: '+event.evidence_sha256,'kv');list.appendChild(item);}
 const kind=last?.kind==='remediation'?'reverification':'remediation',role=kind==='remediation'?'collector':'reviewer';
 const complete=data.next_after_sequence===null,canAppend=complete&&!!data.change_request_id&&data.role===role;
 el('moreHistoryButton').classList.toggle('hide',complete);el('followupForm').classList.toggle('hide',!canAppend);el('outcomeField').classList.toggle('hide',kind!=='reverification');
 display(el('followupAction'),kind==='remediation'?'Record remediation attempt':'Record independent retest');
 display(el('followupStatus'),!complete?'More history is available. Load the remaining pages before recording an event.':!data.change_request_id?'No eligible change request exists for this draft.':canAppend?'Verified '+data.role+' access. The next event is '+kind+'.':'Waiting for a '+role+' to record '+kind+'.');
 if(!events.length){const empty=document.createElement('li');display(empty,'No followup events recorded.');list.appendChild(empty);}
 el('historyArea').classList.remove('hide');
}
async function loadHistory(continuation=false){
 const cursor=continuation?state.followup?.next_after_sequence:0;
 if(!state.token||state.loading||cursor===null||cursor===undefined)return;
 if(!continuation)clearFollowup();setBusy(true);clearStatus();
 try{
  const query=new URLSearchParams({artifact_id:ARTIFACT,finding_id:el('followupFinding').value,after_sequence:String(cursor)});
  const data=await request(endpoint.history+'?'+query,{headers:{apikey:KEY,authorization:'Bearer '+state.token}});
  historyUI(data,continuation);status('Synthetic finding history retrieved. Customer delivery remains blocked.','success');el('historyArea').focus();
 }catch(err){clearFollowup();status(err.message||'History unavailable.','danger');}
 finally{setBusy(false);}
}
async function request(url,init){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
 const res=await fetch(url,{...init,signal:controller.signal,cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'});
 if(!res.ok){
  if(res.status===401&&url!==endpoint.login&&url!==endpoint.signout){reset();el('email').focus();throw Error('Your session expired or was revoked. Sign in again.');}
  throw Error((res.status===401||res.status===403)?'Access denied. Check confirmed account, role membership, and live session.':res.status===409?(url===endpoint.append?'History changed or this event is already recorded. Retrieve finding history before another submission.':'This report already has a recorded decision. Retrieve it again.'):res.status===404?'Report not found.':res.status>=500?'Service unavailable. Try again shortly.':'Request failed ('+res.status+').');
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
  status('Signed in. Retrieve an assessment or finding history to verify role access.','success');
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
el('followupFinding').addEventListener('change',()=>{clearFollowup(true);clearStatus();});
el('historyButton').addEventListener('click',()=>loadHistory());
el('moreHistoryButton').addEventListener('click',()=>loadHistory(true));
el('followupForm').addEventListener('submit',async ev=>{
 ev.preventDefault();const history=state.followup;
 if(!state.token||state.loading||!history||history.next_after_sequence!==null||!history.change_request_id||!el('syntheticOnly').checked)return;
 const last=history.events.at(-1),kind=last?.kind==='remediation'?'reverification':'remediation';
 if(history.role!==(kind==='remediation'?'collector':'reviewer'))return;
 const evidence={classification:'SYNTHETIC_STAGING_ONLY',customer_data:false};
 for(const [key,id,max] of [['observation','followupObservation',4000],['criterion','followupCriterion',2000],['limitations','followupLimitations',2000]]){
  const value=el(id).value.trim();if(value.length<15||value.length>max||/[\u0000-\u001f\u007f]/.test(value))return status('Enter complete plain-text observations, criteria and limitations within the stated limits.','danger');evidence[key]=value;
 }
 const payload={artifact_id:ARTIFACT,expected_sha256:history.source_sha256,review_decision_id:history.change_request_id,finding_id:history.finding_id,sequence:last?last.sequence+1:1,previous_id:last?last.id:null,kind,outcome:kind==='remediation'?null:el('followupOutcome').value,evidence};
 setBusy(true);clearStatus();
 // Discard the append cursor before sending; any uncertain result requires a read.
 state.followup=null;el('followupForm').classList.add('hide');el('moreHistoryButton').classList.add('hide');
 try{
  const data=await request(endpoint.append,{method:'POST',headers:{apikey:KEY,authorization:'Bearer '+state.token,'content-type':'application/json'},body:JSON.stringify(payload)});
  if(data.status!=='recorded'||data.classification!=='SYNTHETIC_STAGING_ONLY'||data.customer_delivery_allowed!==false||data.approval_allowed!==false||!uuid.test(data.event?.id)||data.event.sequence!==payload.sequence||!hash.test(data.event.evidence_sha256))throw Error('Unexpected append response. Retrieve history to check whether the event was recorded.');
  el('followupForm').reset();clearFollowup();status('Synthetic event recorded. Retrieve finding history to verify persistence. A retest PASS does not authorize delivery.','success');
 }catch(err){clearFollowup();status((err.message||'Submission failed.')+' Retrieve finding history to verify the outcome before submitting again.','danger');}
 finally{setBusy(false);if(state.token)el('historyButton').focus();}
});
})();
