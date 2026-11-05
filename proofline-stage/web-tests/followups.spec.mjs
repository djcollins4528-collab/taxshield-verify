import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Mocked UI contracts only: never evidence of live Auth or PostgreSQL acceptance.
const artifact='7aca4913-3869-4d47-932a-699ac060af76',decision='44444444-4444-4444-8444-444444444444',digest='a'.repeat(64);
const eventId=i=>'11111111-1111-4111-8111-'+String(i).padStart(12,'0');
const evidence={classification:'SYNTHETIC_STAGING_ONLY',customer_data:false,observation:'Synthetic observation without customer data.',criterion:'Synthetic test criterion for this fixture.',limitations:'No production system has been verified.'};
const event=i=>({id:eventId(i),sequence:i,previous_id:i===1?null:eventId(i-1),kind:i%2?'remediation':'reverification',outcome:i%2?null:'INCONCLUSIVE',review_decision_id:decision,artifact_sha256:digest,finding_id:'PL-SYN-001',evidence:{...evidence},evidence_sha256:'b'.repeat(64),created_at:'2026-11-05T00:00:00Z'});
const history=(role='collector',events=[])=>({artifact_id:artifact,source_sha256:digest,role,finding_id:'PL-SYN-001',change_request_id:decision,events,next_after_sequence:null,classification:'SYNTHETIC_STAGING_ONLY',customer_delivery_allowed:false,approval_allowed:false});
async function login(page){
 await page.route('**/auth/v1/token?**',r=>r.fulfill({json:{access_token:'synthetic-ui-fixture-token-only',user:{id:'synthetic',email:'synthetic@example.invalid'}}}));
 await page.goto('/');await page.locator('#email').fill('synthetic@example.invalid');await page.locator('#password').fill('synthetic-fixture-only');await page.locator('#signinButton').click();await expect(page.locator('#historyButton')).toBeEnabled();
}
async function load(page,data){
 await page.route('**/proofline-staging-followups/history?**',r=>r.fulfill({json:data}));
 await login(page);await page.locator('#historyButton').click();await expect(page.locator('#historyArea')).toBeVisible();
}
async function fill(page){
 await page.locator('#followupObservation').fill(evidence.observation);await page.locator('#followupCriterion').fill(evidence.criterion);await page.locator('#followupLimitations').fill(evidence.limitations);await page.locator('#syntheticOnly').check();
}
test('mocked collector records remediation using verified history cursor',async({page})=>{
 let sent;
 await page.route('**/proofline-staging-followups/append',r=>{sent=r.request().postDataJSON();return r.fulfill({status:201,json:{status:'recorded',event:{id:eventId(1),sequence:1,evidence_sha256:'b'.repeat(64)},classification:'SYNTHETIC_STAGING_ONLY',customer_delivery_allowed:false,approval_allowed:false}});});
 await load(page,history());await expect(page.locator('#historyArea')).toBeFocused();await expect(page.locator('#followupAction')).toHaveText('Record remediation attempt');await expect(page.locator('#outcomeField')).toBeHidden();await fill(page);await page.locator('#submitFollowup').click();
 await expect(page.locator('#status')).toContainText('Synthetic event recorded');
 expect(sent).toEqual({artifact_id:artifact,expected_sha256:digest,review_decision_id:decision,finding_id:'PL-SYN-001',sequence:1,previous_id:null,kind:'remediation',outcome:null,evidence});
 await expect(page.locator('#followupForm')).toBeHidden();await expect(page.locator('#historyButton')).toBeFocused();
});
test('mocked reviewer retests an existing remediation and can select inconclusive',async({page})=>{
 let sent;
 await page.route('**/proofline-staging-followups/append',r=>{sent=r.request().postDataJSON();return r.fulfill({status:201,json:{status:'recorded',event:{id:eventId(2),sequence:2,evidence_sha256:'b'.repeat(64)},classification:'SYNTHETIC_STAGING_ONLY',customer_delivery_allowed:false,approval_allowed:false}});});
 await load(page,history('reviewer',[event(1)]));await expect(page.locator('#followupAction')).toHaveText('Record independent retest');await expect(page.locator('#followupOutcome')).toHaveValue('INCONCLUSIVE');await fill(page);await page.locator('#submitFollowup').click();await expect(page.locator('#status')).toContainText('Synthetic event recorded');
 expect(sent.kind).toBe('reverification');expect(sent.outcome).toBe('INCONCLUSIVE');expect(sent.previous_id).toBe(eventId(1));expect(sent.sequence).toBe(2);
});
for(const [role,events,waiting] of [['reviewer',[],'collector'],['collector',[event(1)],'reviewer']])test(`mocked ${role} cannot perform next ${waiting} action`,async({page})=>{
 await load(page,history(role,events));await expect(page.locator('#followupForm')).toBeHidden();await expect(page.locator('#followupStatus')).toContainText('Waiting for a '+waiting);
});
test('mocked next attempt keeps earlier inconclusive outcome visible',async({page})=>{
 await load(page,history('collector',[event(1),event(2)]));await expect(page.locator('#followupHistory')).toContainText('INCONCLUSIVE');await expect(page.locator('#followupAction')).toHaveText('Record remediation attempt');await expect(page.locator('#followupForm')).toBeVisible();
});
for(const kind of ['conflict','network','timeout'])test(`mocked ${kind} discards cursor and forbids blind resubmission`,async({page})=>{
 if(kind==='timeout')await page.clock.install();
 let calls=0;await page.route('**/proofline-staging-followups/append',r=>{calls++;return kind==='network'?r.abort():kind==='timeout'?undefined:r.fulfill({status:409,json:{error:'conflict'}});});
 await load(page,history());await fill(page);await page.locator('#submitFollowup').click();if(kind==='timeout')await page.clock.fastForward(13000);
 await expect(page.locator('#status')).toContainText('Retrieve finding history');await expect(page.locator('#followupForm')).toBeHidden();await expect(page.locator('#historyButton')).toBeEnabled();expect(calls).toBe(1);
});
test('mocked revoked followup session clears all history and inputs',async({page})=>{
 await page.route('**/proofline-staging-followups/append',r=>r.fulfill({status:401,json:{error:'revoked'}}));await load(page,history());await fill(page);await page.locator('#submitFollowup').click();
 await expect(page.locator('#reviewPanel')).toBeHidden();await expect(page.locator('#email')).toBeFocused();await expect(page.locator('#followupHistory li')).toHaveCount(0);await expect(page.locator('#followupObservation')).toHaveValue('');
});
test('mocked finding switch invalidates history and form',async({page})=>{
 await load(page,history());await fill(page);await page.locator('#followupFinding').selectOption('PL-SYN-002');await expect(page.locator('#historyArea')).toBeHidden();await expect(page.locator('#followupForm')).toBeHidden();await expect(page.locator('#syntheticOnly')).not.toBeChecked();
});
test('mocked pagination prevents appending until all pages loaded',async({page})=>{
 await page.route('**/proofline-staging-followups/history?**',r=>{
  const next=new URL(r.request().url()).searchParams.get('after_sequence')==='100';
  return r.fulfill({json:{...history('reviewer',next?[event(101)]:Array.from({length:100},(_,i)=>event(i+1))),next_after_sequence:next?null:100}});
 });
 await login(page);await page.locator('#historyButton').click();await expect(page.locator('#moreHistoryButton')).toBeVisible();await expect(page.locator('#followupForm')).toBeHidden();await page.locator('#moreHistoryButton').click();await expect(page.locator('#followupHistory li')).toHaveCount(101);await expect(page.locator('#followupForm')).toBeVisible();await expect(page.locator('#moreHistoryButton')).toBeHidden();
});
for(const broken of ['chain','classification','delivery','digest','decision'])test(`mocked ${broken} history contract fails closed`,async({page})=>{
 const data=history('reviewer',[event(1)]);
 if(broken==='chain')data.events[0].sequence=2;
 if(broken==='classification')data.classification='CUSTOMER';
 if(broken==='delivery')data.customer_delivery_allowed=true;
 if(broken==='digest')data.events[0].artifact_sha256='c'.repeat(64);
 if(broken==='decision')data.events[0].review_decision_id=eventId(5);
 await page.route('**/proofline-staging-followups/history?**',r=>r.fulfill({json:data}));await login(page);await page.locator('#historyButton').click();await expect(page.locator('#status')).toContainText('Invalid');await expect(page.locator('#followupForm')).toBeHidden();await expect(page.locator('#historyArea')).toBeHidden();
});
test('mocked mobile history renders evidence as text and has no automated axe violations',async({page})=>{
 const item=event(1);item.evidence.observation='<img src=x onerror=alert(1)>';
 await page.setViewportSize({width:320,height:900});await load(page,history('reviewer',[item]));
 await expect(page.locator('#followupHistory')).toContainText(item.evidence.observation);await expect(page.locator('#followupHistory img')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(result.violations).toEqual([]);
});
