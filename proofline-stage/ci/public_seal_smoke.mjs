/** No credentials or customer data: read-only/blocked-route staging sentinel. */
export const RENDER = 'https://proofline-sealed-staging.onrender.com';
export const SUPABASE = 'https://pgknyzwctmfqvlivlgpe.supabase.co';
export const TENANT = 'bbbbaaaa-1111-4111-8111-000000000001';
async function request(fetcher,url,method='GET') {
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),55000);
 try{
  const resp=await fetcher(url,{method,redirect:'error',signal:controller.signal,headers:{accept:'application/json','cache-control':'no-store'}});
  if(!Number.isInteger(resp.status))throw Error('non-HTTP response');
  return resp;
 }finally{clearTimeout(timer)}
}
export async function verifySeal(fetcher,report=()=>{}) {
 const checks=[
  {name:'Render health sealed',url:RENDER+'/healthz',method:'GET',allowed:[200],body:{service:'proofline-staging',state:'sealed',intake:'disabled'}},
  {name:'Render readiness blocked',url:RENDER+'/readyz',method:'GET',allowed:[503],body:{ready:false}},
  {name:'Render customer read denied',url:RENDER+'/v1/evidence',method:'GET',allowed:[403]},
  {name:'Render customer write denied',url:RENDER+'/v1/evidence',method:'POST',allowed:[403]},
  {name:'Supabase anonymous Auth denied',url:SUPABASE+'/functions/v1/proofline-staging-auth/check?tenant='+TENANT+'&role=collector',method:'GET',allowed:[401,403]},
 ];
 const results=[];
 for(const c of checks){
  let response;
  try{response=await request(fetcher,c.url,c.method)}
  catch(e){throw Error(c.name+': network check unavailable ('+e.name+'); NOT VERIFIED')}
  if(!c.allowed.includes(response.status))throw Error(c.name+': unexpected HTTP '+response.status+', expected '+c.allowed.join('/'));
  if(c.body){
   let parsed;
   try{parsed=await response.json()}catch{throw Error(c.name+': response not JSON')}
   for(const [k,v] of Object.entries(c.body))if(parsed?.[k]!==v)throw Error(c.name+': wrong '+k);
  }
  report('PASS: '+c.name+' [HTTP '+response.status+']');
  results.push({check:c.name,status:response.status});
 }
 return {result:'SEALED_CONFIRMED',checks:results};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{const result=await verifySeal(fetch,s=>console.log(s));console.log(result.result+' ('+result.checks.length+' public probes)')}
 catch(e){console.error('FAIL CLOSED: '+e.message);process.exitCode=1}
}
