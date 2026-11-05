// Operator-run staging acceptance. Reruns only append missing entries of this fixed exercise.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium,webkit,expect} from '@playwright/test';
import {validate,BASE} from '../ci/live_auth_acceptance.mjs';

const env=validate(process.env);
assert.equal(env.PROOFLINE_RECORD_SYNTHETIC_FOLLOWUP,'yes','Explicit synthetic follow-up opt-in required');
const site='https://proofline-assurance-staging.vercel.app';
const route=BASE+'/functions/v1/proofline-staging-followups';
const artifact='7aca4913-3869-4d47-932a-699ac060af76';
const finding='PL-SYN-002';
const source='f5e54ce59405395351901e604da8a13ded572cc2502ebeb94b08db7abe969d6d';
const decision='a86c83e5-9c54-474e-a284-e9c9c48b0314';
const criterion='The release preflight passes under verified real-user sessions and externally reviewed evidence.';
const limitations='Both staging roles are controlled by one owner. Independent human review and external evidence acceptance are outstanding.';
const observations=[
 'SAMPLE / SYNTHETIC. The confirmed-account acceptance receipt records nine passing staging role authorization and session revocation checks.',
 'SAMPLE / SYNTHETIC. The original finding requires externally reviewed evidence. The staging authorization checks passed, but independent review is outstanding.'
];
const historyUrl=route+'/history?'+new URLSearchParams({artifact_id:artifact,finding_id:finding,after_sequence:'0'});
const created=[];
const checks=[];
function checked(name,test){assert.ok(test,name);checks.push(name);}
function payload(index,previous){
 return {artifact_id:artifact,expected_sha256:source,review_decision_id:decision,finding_id:finding,
  sequence:index+1,previous_id:previous,kind:index?'reverification':'remediation',outcome:index?'INCONCLUSIVE':null,
  evidence:{classification:'SYNTHETIC_STAGING_ONLY',customer_data:false,observation:observations[index],criterion,limitations}};
}
function verifyHistory(data,role) {
 assert.equal(data.role,role);assert.equal(data.finding_id,finding);assert.equal(data.artifact_id,artifact);
 assert.equal(data.source_sha256,source);assert.equal(data.change_request_id,decision);
 assert.equal(data.classification,'SYNTHETIC_STAGING_ONLY');assert.equal(data.customer_delivery_allowed,false);
 assert.equal(data.approval_allowed,false);assert.equal(data.next_after_sequence,null);
 assert.ok(data.events.length<=2,'Refuse to extend unrelated acceptance history');
 for(const [i,event] of data.events.entries()){
  const expected=payload(i,i?data.events[i-1].id:null);
  for(const k of ['sequence','kind','outcome','previous_id','finding_id','review_decision_id'])assert.equal(event[k],expected[k]);
  assert.equal(event.artifact_sha256,source);assert.deepEqual(event.evidence,expected.evidence);
  assert.match(event.evidence_sha256,/^[0-9a-f]{64}$/);
 }
}
async function request(url,token,body){
 return fetch(url,{method:body?'POST':'GET',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+token,
  ...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(15000)});
}
async function exercise(engine,role,index,readOnly=false){
 const browser=await engine.launch();
 let token;
 try{
  const page=await browser.newPage();
  await page.goto(site);
  assert.equal(new URL(page.url()).origin,site);
  await page.locator('#email').fill(env['PROOFLINE_'+role.toUpperCase()+'_EMAIL']);
  await page.locator('#password').fill(env['PROOFLINE_'+role.toUpperCase()+'_PASSWORD']);
  const login=page.waitForResponse(r=>r.url()===BASE+'/auth/v1/token?grant_type=password');
  await page.locator('#signinButton').click();
  token=(await (await login).json()).access_token;
  assert.ok(token,'Official staging sign-in required');
  await page.locator('#followupFinding').selectOption(finding);
  async function history(){
   const response=page.waitForResponse(r=>r.url().startsWith(route+'/history?'));
   await page.locator('#historyButton').click();const r=await response;
   assert.equal(r.status(),200,'Live history HTTP status');
   const data=await r.json();verifyHistory(data,role);
   await expect(page.locator('#historyArea')).toBeVisible();return data;
  }
  let data=await history();
  if(readOnly){
   checked('fresh '+role+' session retrieves both linked events',data.events.length===2);
   await expect(page.locator('#followupHistory')).toContainText('INCONCLUSIVE');
  }else{
   if(data.events.length===index){
    await page.locator('#followupObservation').fill(observations[index]);
    await page.locator('#followupCriterion').fill(criterion);
    await page.locator('#followupLimitations').fill(limitations);
    if(index)await page.locator('#followupOutcome').selectOption('INCONCLUSIVE');
    await page.locator('#syntheticOnly').check();
    const response=page.waitForResponse(r=>r.url()===route+'/append');
    await page.locator('#submitFollowup').click();const r=await response;
    assert.equal(r.status(),201,'Browser append HTTP status');
    const receipt=await r.json();assert.equal(receipt.customer_delivery_allowed,false);
    created.push(receipt.event.id);
    await expect(page.locator('#status')).toContainText('Synthetic event recorded');
    data=await history();
   }
   assert.ok(data.events.length>index);
   const current=payload(index,index?data.events[0].id:null);
   const duplicate=await request(route+'/append',token,current);
   checked(role+' duplicate rejected',duplicate.status===409);
   const wrong=index?payload(0,null):payload(1,data.events[0].id);
   checked(role+' wrong-role append denied',(await request(route+'/append',token,wrong)).status===403);
   checked(role+' forged actor rejected',(await request(route+'/append',token,{...current,actor_id:artifact})).status===400);
   checked(role+' malformed artifact rejected',(await request(route+'/append',token,{...current,artifact_id:[artifact]})).status===400);
   checked(role+' verified persisted event',data.events[index].evidence.observation===observations[index]);
  }
  await page.locator('#signoutButton').click();
  await expect(page.locator('#status')).toContainText('Server sign-out confirmed');
  checked(role+' revoked history denied',[401,403].includes((await request(historyUrl,token)).status));
  token=null;
 }finally{
  try{
   if(token){
    const logout=await fetch(BASE+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+token},signal:AbortSignal.timeout(12000)});
    assert.ok([200,204,401,403].includes(logout.status),'Verify cleanup of failed session');
   }
  }finally{await browser.close();}
 }
}
await exercise(chromium,'collector',0);
await exercise(webkit,'reviewer',1);
await exercise(chromium,'reviewer',1,true);
await exercise(webkit,'collector',0,true);
const receipt={observed_at:new Date().toISOString(),artifact,finding,decision,source,created,checks,customer_delivery_allowed:false,outcome:'INCONCLUSIVE'};
if(env.PROOFLINE_ACCEPTANCE_OUTPUT)await writeFile(env.PROOFLINE_ACCEPTANCE_OUTPUT,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
