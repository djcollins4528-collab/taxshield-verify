import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifySeal,RENDER,SUPABASE,TENANT} from './public_seal_smoke.mjs';
const expected=[
 [RENDER+'/healthz',200,{service:'proofline-staging',state:'sealed',intake:'disabled'}],
 [RENDER+'/readyz',503,{ready:false,reason:'offline_acceptance_pending'}],
 [RENDER+'/v1/evidence',403,{}],
 [RENDER+'/v1/evidence',403,{}],
 [SUPABASE+'/functions/v1/proofline-staging-auth/check?tenant='+TENANT+'&role=collector',401,{}]
];
function mock({override={},unavailable=-1}={}){
 let index=0,requests=[];
 return {requests,fetcher:async(url,init)=>{
  const i=index++,item=expected[i];
  requests.push({url,method:init.method});
  if(i===unavailable)throw Error('unreachable');
  if(!item||url!==item[0])throw Error('unexpected destination');
  return {status:override[i]?.status??item[1],json:async()=>override[i]?.body??item[2]};
 }};
}
test('five public probes pass for sealed staging only',async()=>{
 const m=mock(),seen=[];
 const r=await verifySeal(m.fetcher,msg=>seen.push(msg));
 assert.equal(r.result,'SEALED_CONFIRMED');assert.equal(seen.length,5);
 assert.deepEqual(m.requests.map(x=>x.method),['GET','GET','GET','POST','GET']);
});
test('fails when health says live',async()=>{
 const m=mock({override:{0:{body:{service:'proofline-staging',state:'live',intake:'enabled'}}}});
 await assert.rejects(verifySeal(m.fetcher),/wrong state/);
});
test('fails if customer readiness is 200',async()=>{await assert.rejects(verifySeal(mock({override:{1:{status:200}}}).fetcher),/unexpected HTTP 200/)});
test('fails if customer reads are allowed',async()=>{await assert.rejects(verifySeal(mock({override:{2:{status:200}}}).fetcher),/unexpected HTTP 200/)});
test('fails if customer writes are allowed',async()=>{await assert.rejects(verifySeal(mock({override:{3:{status:201}}}).fetcher),/unexpected HTTP 201/)});
test('fails if anonymous Auth returns 200',async()=>{await assert.rejects(verifySeal(mock({override:{4:{status:200}}}).fetcher),/unexpected HTTP 200/)});
test('fails closed on network errors',async()=>{await assert.rejects(verifySeal(mock({unavailable:0}).fetcher),/NOT VERIFIED/)});
test('fails on malformed health JSON',async()=>{await assert.rejects(verifySeal(mock({override:{0:{body:{}}}}).fetcher),/wrong service/)});
