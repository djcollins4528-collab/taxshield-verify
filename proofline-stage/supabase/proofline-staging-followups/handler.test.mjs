import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from './handler.mjs';
import {validateAppend,validateHistory,ISSUER} from './policy.mjs';
import {runFollowup} from './database.mjs';
const actor='11111111-1111-4111-8111-111111111111',session='11111111-1111-4111-8111-000000000001';
const artifact='33333333-3333-4333-8333-333333333333',decision='44444444-4444-4444-8444-444444444444';
const user={id:actor,is_anonymous:false,aud:'authenticated'};
const claims={sub:actor,session_id:session,iss:ISSUER,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+300};
const jwt=(c=claims)=>'header.'+Buffer.from(JSON.stringify(c)).toString('base64url')+'.signature';
const payload=()=>({artifact_id:artifact,expected_sha256:'a'.repeat(64),review_decision_id:decision,finding_id:'PL-SYN-002',sequence:1,previous_id:null,kind:'remediation',outcome:null,evidence:{classification:'SYNTHETIC_STAGING_ONLY',customer_data:false,observation:'Synthetic observation without customer data.',criterion:'Synthetic test criterion for this fixture.',limitations:'No production posture has been verified.'}});
function fixture(overrides={}) {
 const calls=[];
 const handler=createHandler({configured:()=>true,authenticate:async()=>user,run:async(...args)=>{calls.push(args);return {status:'recorded'};},...overrides});
 const call=async({method='POST',route='append',body=payload(),headers={},token=jwt()}={})=>handler(new Request('https://test.invalid/functions/v1/proofline-staging-followups/'+route,{method,headers:{authorization:'Bearer '+token,'content-type':'application/json',...headers},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}));
 return {call,calls,handler};
}
test('verified identity alone supplies actor and session; response always locks delivery',async()=>{
 const {call,calls}=fixture();const r=await call();assert.equal(r.status,201);
 assert.deepEqual(calls[0][2],{actorId:actor,sessionId:session});
 const body=await r.json();assert.equal(body.customer_delivery_allowed,false);assert.equal(body.approval_allowed,false);
 assert.equal(r.headers.get('cache-control'),'private, no-store');
});
for(const key of ['actor_id','session_id','tenant_id','evidence_sha256','customer_delivery_allowed'])test('reject injected '+key,async()=>{
 const {call,calls}=fixture();assert.equal((await call({body:{...payload(),[key]:actor}})).status,400);assert.equal(calls.length,0);
});
for(const [name,patch] of Object.entries({expired:{exp:1},wrongIssuer:{iss:'https://elsewhere.invalid'},wrongSubject:{sub:artifact},serviceRole:{role:'service_role'},missingSession:{session_id:null},future:{nbf:4102444800}}))test('deny '+name+' claims before database access',async()=>{
 const {call,calls}=fixture();assert.equal((await call({token:jwt({...claims,...patch})})).status,401);assert.equal(calls.length,0);
});
test('Auth verification errors do not reach database',async()=>{
 for(const authenticate of [async()=>null,async()=>({...user,is_anonymous:true}),async()=>{throw Error('private upstream details');}]){
  const f=fixture({authenticate});assert.equal((await f.call()).status,401);assert.equal(f.calls.length,0);
 }
});
test('wrong origin, method, route and malformed payload do not reach database',async()=>{
 const {call,calls}=fixture();
 for(const [options,status] of [[{headers:{origin:'https://evil.invalid'}},403],[{method:'DELETE'},405],[{route:'approve'},404],[{body:'{'},400],[{headers:{'content-type':'application/jsonp'}},415],[{route:'append?unused=1'},400],[{token:'invalid'},401]])assert.equal((await call(options)).status,status);
 assert.equal(calls.length,0);
});
test('only allowed origins receive preflight permission',async()=>{
 const {call}=fixture();const r=await call({method:'OPTIONS',headers:{origin:'https://proofline-assurance-staging.vercel.app'}});
 assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),'https://proofline-assurance-staging.vercel.app');
 assert.equal((await call({method:'OPTIONS'})).status,403);
});
test('streamed bytes bounded without Content-Length',async()=>{
 const {call,calls}=fixture();assert.equal((await call({body:' '.repeat(20001)})).status,413);
 assert.equal((await call({body:'é'.repeat(10001)})).status,413);assert.equal(calls.length,0);
});
test('oversized declared body is rejected',async()=>{
 assert.equal((await fixture().call({headers:{'content-length':'20001'}})).status,413);
});
test('deny live-session, membership and artifact failures without disclosure',async()=>{
 const {call}=fixture({run:async()=>null});const r=await call();assert.equal(r.status,403);assert.deepEqual(await r.json(),{error:'followup_not_authorized'});
});
for(const [code,status] of [['23505',409],['42501',403],['23514',403],['23503',403],['23502',403],['08006',503],['57014',503]])test('database error '+code+' is sanitized',async()=>{
 const {call}=fixture({run:async()=>{throw Object.assign(Error('password/SQL/private'),{code});}});const r=await call();assert.equal(r.status,status);assert.ok(!(await r.text()).includes('private'));
});
test('missing environment fails closed',async()=>{assert.equal((await fixture({configured:()=>false}).call()).status,503);});
test('history accepts only a bounded cursor and unambiguous exact parameters',async()=>{
 const {call,calls}=fixture();const route=`history?artifact_id=${artifact}&finding_id=PL-SYN-002&after_sequence=0`;
 assert.equal((await call({method:'GET',route})).status,200);assert.equal(calls[0][1].after_sequence,0);
 for(const tail of ['&actor_id='+actor,'&after_sequence=1','0','-1'])assert.equal((await call({method:'GET',route:tail==='0'||tail==='-1'?route.replace('sequence=0','sequence='+tail+'0'):route+tail})).status,400);
 assert.equal(validateHistory(new URL('https://x.invalid/?artifact_id='+artifact+'&finding_id=x&after_sequence=2147483648')),null);
});
test('reject incomplete evidence, customer data, invalid sequence/outcome and first retest',()=>{
 for(const modify of [v=>{delete v.evidence.limitations;},v=>{v.evidence.customer_data=true;},v=>{v.evidence.customer_data='false';},v=>{v.evidence.observation='short';},v=>{v.evidence.extra='unbounded';},v=>{v.outcome='PASS';},v=>{v.kind='reverification';v.outcome='PASS';},v=>{v.sequence=2;},v=>{v.sequence=1.5;},v=>{v.evidence.criterion+='\n';}]){
  const v=payload();modify(v);assert.equal(validateAppend(v),null);
 }
 const v=payload();Object.assign(v,{sequence:2,previous_id:artifact,kind:'reverification',outcome:'INCONCLUSIVE'});assert.ok(validateAppend(v));
});
function databaseFixture(results) {
 const calls=[];
 const tx=async(strings,...values)=>{calls.push({sql:strings.join('?'),values});return results.shift()??[];};
 tx.json=v=>v;
 return {sql:{begin:async fn=>fn(tx)},calls};
}
test('database adapter stops before artifact/history access for revoked session or membership',async()=>{
 const db=databaseFixture([[],[],[]]);
 assert.equal(await runFollowup(db.sql,'history',{artifact_id:artifact,finding_id:'x',after_sequence:0},{actorId:actor,sessionId:session}),null);
 assert.equal(db.calls.length,3);
});
test('database adapter rejects wrong artifact digest without inserting',async()=>{
 const db=databaseFixture([[],[],[{role:'collector'}],[{id:artifact,source_sha256:'b'.repeat(64)}]]);
 assert.equal(await runFollowup(db.sql,'append',payload(),{actorId:actor,sessionId:session}),null);assert.equal(db.calls.length,4);
});
test('database adapter binds verified identity and returns trigger-computed hash',async()=>{
 const db=databaseFixture([[],[],[{role:'collector'}],[{id:artifact,source_sha256:'a'.repeat(64)}],[{id:decision,sequence:1,evidence_sha256:'c'.repeat(64)}]]);
 const r=await runFollowup(db.sql,'append',payload(),{actorId:actor,sessionId:session});
 assert.equal(r.event.evidence_sha256,'c'.repeat(64));assert.ok(db.calls[4].values.includes(actor));assert.ok(db.calls[4].values.includes(session));
});
test('history pages are bounded and do not skip the next event',async()=>{
 const events=Array.from({length:101},(_,i)=>({sequence:i+1}));
 const db=databaseFixture([[],[],[{role:'collector'}],[{id:artifact,source_sha256:'a'.repeat(64)}],[{id:decision}],events]);
 const r=await runFollowup(db.sql,'history',{artifact_id:artifact,finding_id:'x',after_sequence:0},{actorId:actor,sessionId:session});
 assert.equal(r.events.length,100);assert.equal(r.next_after_sequence,100);
 assert.equal(r.role,'collector');assert.equal(r.change_request_id,decision);assert.equal(r.finding_id,'x');
});
test('history without a matching change request cannot invent an eligible decision',async()=>{
 const db=databaseFixture([[],[],[{role:'reviewer'}],[{id:artifact,source_sha256:'a'.repeat(64)}],[],[]]);
 const r=await runFollowup(db.sql,'history',{artifact_id:artifact,finding_id:'x',after_sequence:0},{actorId:actor,sessionId:session});
 assert.equal(r.role,'reviewer');assert.equal(r.change_request_id,null);assert.deepEqual(r.events,[]);
});
test('duplicate or unrecognized database roles fail closed',async()=>{
 for(const access of [[{role:'auditor'}],[{role:'collector'},{role:'reviewer'}]]){
  const db=databaseFixture([[],[],access]);
  assert.equal(await runFollowup(db.sql,'history',{artifact_id:artifact,finding_id:'x',after_sequence:0},{actorId:actor,sessionId:session}),null);
 }
});
