// Explicit operator-run test: real staging Auth, browser and API, no mocks.
// Records one append-only changes_requested decision; reruns verify the existing one.
import {chromium,webkit,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {validate,BASE} from '../ci/live_auth_acceptance.mjs';
const env=validate(process.env);
if(env.PROOFLINE_RECORD_SYNTHETIC_REVIEW!=='yes')throw Error('Explicit synthetic review opt-in required');
const site='https://proofline-assurance-staging.vercel.app';
const artifact='7aca4913-3869-4d47-932a-699ac060af76';
const digest='f5e54ce59405395351901e604da8a13ded572cc2502ebeb94b08db7abe969d6d';
const rationale='SAMPLE / SYNTHETIC acceptance: changes required. Obtain authorized source evidence and independently verify remediation before any production assessment. This fixture cannot establish a real customer outcome or authorize delivery.';
const checks=[];
const check=(name,actual,expected)=>{if(actual!==expected)throw Error(name+' failed');checks.push(name);};
const sessions=[];
async function api(path,token,body){
 return fetch(BASE+path,{method:body?'POST':'GET',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000),redirect:'error'});
}
async function logout(token){
 const r=await fetch(BASE+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+token},signal:AbortSignal.timeout(12000),redirect:'error'});
 if(![200,204].includes(r.status))throw Error('Session cleanup failed');
}
let created=false;
try{
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch();
  try{
   for(const role of ['COLLECTOR','REVIEWER']){
    const context=await browser.newContext();
    try{
     const page=await context.newPage();await page.goto(site);
     await page.locator('#email').fill(env['PROOFLINE_'+role+'_EMAIL']);
     await page.locator('#password').fill(env['PROOFLINE_'+role+'_PASSWORD']);
     const auth=page.waitForResponse(r=>r.url().includes('/auth/v1/token?'));
     await page.locator('#signinButton').click();
     const token=(await (await auth).json()).access_token;
     if(!token)throw Error('Sign-in failed');sessions.push(token);
     await expect(page.locator('#loadButton')).toBeFocused();
     const payload={artifact_id:artifact,expected_sha256:digest,decision:'changes_requested',rationale};
     const decide=(body)=>api('/functions/v1/proofline-staging-review-decisions/decide',token,body);
     if(role==='COLLECTOR'){
      check(name+' collector decision denied',(await decide(payload)).status,403);
     }else{
      check(name+' approval denied',(await decide({...payload,decision:'approved'})).status,400);
      check(name+' digest mismatch denied',(await decide({...payload,expected_sha256:'0'.repeat(64)})).status,403);
      check(name+' unknown artifact denied',(await decide({...payload,artifact_id:'ccccaaaa-2222-4222-8222-000000000002'})).status,403);
      const read=page.waitForResponse(r=>r.url().includes('/proofline-staging-review-report/report?'));
      await page.locator('#loadButton').click();const response=await read;
      check(name+' reviewer read',response.status(),200);const report=await response.json();
      check(name+' immutable digest',report.source_sha256,digest);
      check(name+' delivery locked',report.customer_delivery_allowed,false);
      if(!report.decision_recorded){
       await page.locator('#decision').selectOption('changes_requested');
       await page.locator('#rationale').fill(rationale);
       const recorded=page.waitForResponse(r=>r.url().endsWith('/proofline-staging-review-decisions/decide'));
       await page.locator('#submitDecision').click();check(name+' browser decision created',(await recorded).status(),201);
       created=true;await expect(page.locator('#status')).toContainText('Decision recorded.');
       await page.locator('#loadButton').click();
      }
      await expect(page.locator('#decisionStatus')).toContainText('changes_requested');
      await expect(page.locator('#decisionForm')).toBeHidden();
      checks.push(name+' persisted decision visible and form hidden');
      check(name+' duplicate denied',(await decide(payload)).status,409);
      check(name+' replacement denied',(await decide({...payload,decision:'rejected'})).status,409);
     }
     await page.locator('#signoutButton').click();
     await expect(page.locator('#status')).toContainText('Server sign-out confirmed');
     sessions.splice(sessions.indexOf(token),1);
     check(name+' '+role+' revoked decision denied',[401,403].includes((await decideAfterLogout(token,payload)).status),true);
    }finally{await context.close();}
   }
  }finally{await browser.close();}
 }
}finally{
 // Revoke even if a browser assertion failed. Never log tokens or credentials.
 const cleanup=await Promise.allSettled(sessions.map(logout));
 if(cleanup.some(r=>r.status==='rejected'))throw Error('At least one session cleanup failed');
}
async function decideAfterLogout(token,payload){return api('/functions/v1/proofline-staging-review-decisions/decide',token,payload);}
const result={observed_at:new Date().toISOString(),scope:'real owner-controlled staging accounts; synthetic draft only',artifact_id:artifact,source_sha256:digest,created,passed:checks.length,checks,customer_delivery_allowed:false,production_ready:false};
if(env.PROOFLINE_ACCEPTANCE_OUTPUT)await writeFile(env.PROOFLINE_ACCEPTANCE_OUTPUT,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
