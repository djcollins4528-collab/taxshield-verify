import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// These routes are synthetic UI fixtures, never evidence of live Auth acceptance.
async function login(page){
 await page.route('**/auth/v1/token?**',r=>r.fulfill({json:{access_token:'synthetic-ui-fixture-token-only',user:{id:'synthetic',email:'synthetic@example.invalid'}}}));
 await page.goto('/');
 await page.locator('#email').fill('synthetic@example.invalid');
 await page.locator('#password').fill('synthetic-ui-fixture-only');
 await page.locator('#signinButton').click();
 await expect(page.locator('#loadButton')).toBeEnabled();
}
for(const width of [1440,768,390,320])test(`live rendering ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto('/?utm_source=one&utm_source=two&extra=%25&malformed=%ZZ');
 expect(response.status()).toBe(200);
 await expect(page.getByText('Release locked.',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 // Windows WebKit emits a native <select> style CSP warning even with no inline DOM styles.
 // Retain strict CSP; enforce absence of application inline styles instead of hiding this limitation.
 await expect(page.locator('[style]')).toHaveCount(0);
 expect(errors).toEqual([]);
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
 expect(axe.violations).toEqual([]);
 for(const id of ['email','password','signinButton'])expect((await page.locator('#'+id).boundingBox()).height).toBeGreaterThanOrEqual(44);
 await page.locator('.skip-link').focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('#main-content')).toBeFocused();
 await page.screenshot({path:`results/${test.info().project.name}-${width}.png`,fullPage:true});
});
test('mocked sign-in transfers focus after enabling controls',async({page})=>{
 await login(page);await expect(page.locator('#loadButton')).toBeFocused();
 expect(await page.locator('#password').inputValue()).toBe('');
});
for(const code of [200,204])test(`mocked empty ${code} logout succeeds`,async({page})=>{
 await page.route('**/auth/v1/logout',r=>r.fulfill({status:code,body:''}));
 await login(page);await page.locator('#signoutButton').click();
 await expect(page.locator('#status')).toContainText('Server sign-out confirmed');
 await expect(page.locator('#email')).toBeFocused();
});
for(const kind of ['503','network'])test(`mocked logout ${kind} announces unconfirmed revocation`,async({page})=>{
 await page.route('**/auth/v1/logout',r=>kind==='network'?r.abort():r.fulfill({status:503,body:'unavailable'}));
 await login(page);await page.locator('#signoutButton').click();
 await expect(page.locator('#status')).toContainText('server sign-out could not be confirmed');
 await expect(page.locator('#status')).toHaveAttribute('aria-live','assertive');
 await expect(page.locator('#reviewPanel')).toBeHidden();
 await expect(page.locator('#email')).toBeFocused();
});
test('mocked report session expiry clears authenticated UI',async({page})=>{
 await page.route('**/functions/v1/proofline-staging-review-report/**',r=>r.fulfill({status:401,body:'unauthorized'}));
 await login(page);await page.locator('#loadButton').click();
 await expect(page.locator('#status')).toContainText('session expired or was revoked');
 await expect(page.locator('#reviewPanel')).toBeHidden();
 await expect(page.locator('#email')).toBeFocused();
});
test('mocked report 503 is actionable and retry remains available',async({page})=>{
 await page.route('**/functions/v1/proofline-staging-review-report/**',r=>r.fulfill({status:503,body:'unavailable'}));
 await login(page);await page.locator('#loadButton').click();
 await expect(page.locator('#status')).toContainText('Service unavailable. Try again shortly.');
 await expect(page.locator('#loadButton')).toBeEnabled();
 await expect(page.locator('#reportArea')).toBeHidden();
});
test('mocked report timeout releases controls',async({page})=>{
 await page.clock.install();
 await page.route('**/functions/v1/proofline-staging-review-report/**',()=>{});
 await login(page);await page.locator('#loadButton').click();
 await page.clock.fastForward(13000);
 await expect(page.locator('#status')).toContainText('Request timed out');
 await expect(page.locator('#loadButton')).toBeEnabled();
});
test('mocked synthetic report is rendered as text and receives focus',async({page})=>{
 await page.route('**/functions/v1/proofline-staging-review-report/**',r=>r.fulfill({json:{
 classification:'SYNTHETIC_STAGING_ONLY',customer_delivery_allowed:false,approval_allowed:false,source_sha256:'0'.repeat(64),
 report:{classification:'SYNTHETIC_STAGING_ONLY',report_status:'DRAFT_NOT_APPROVED',customer_deliverable:false,review:{sign_off_status:'NOT_SIGNED'},executive_summary:{headline:'SAMPLE / SYNTHETIC',narrative:'<img src=x onerror=alert(1)>'},findings:[],remediation_plan:[]}
 }}));
 await login(page);await page.locator('#loadButton').click();
 await expect(page.locator('#reportArea')).toBeFocused();
 await expect(page.locator('#summary')).toHaveText('<img src=x onerror=alert(1)>');
 await expect(page.locator('#summary img')).toHaveCount(0);
 await expect(page.locator('#decision option')).toHaveCount(2);
});
