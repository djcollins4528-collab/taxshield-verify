import {validateTestMailboxes} from './test_mailbox_policy.mjs';
// Owner-run ONLY: request email confirmation via official Supabase Auth signup.
// This is never a public HTTP endpoint, and it does not create memberships.
export const STAGING='https://pgknyzwctmfqvlivlgpe.supabase.co';
const KEYS=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','PROOFLINE_COLLECTOR_EMAIL','PROOFLINE_COLLECTOR_PASSWORD','PROOFLINE_REVIEWER_EMAIL','PROOFLINE_REVIEWER_PASSWORD'];
export function validate(env){
 for(const k of KEYS)if(typeof env[k]!=='string'||!env[k])throw Error('Missing '+k);
 if(env.SUPABASE_URL!==STAGING)throw Error('Refusing any project except Proofline staging');
 if(!env.SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_'))throw Error('Modern Supabase publishable key required; admin/secret key forbidden');
 for(const role of ['collector','reviewer']){
  const address=env['PROOFLINE_'+role.toUpperCase()+'_EMAIL'];
  if(!new RegExp('^proofline-'+role+'-test(?:\\+[a-z0-9_-]+)?@[a-z0-9.-]+\\.[a-z]{2,}$','i').test(address))throw Error('Dedicated '+role+' test mailbox required');
  const pw=env['PROOFLINE_'+role.toUpperCase()+'_PASSWORD'];
  if(pw.length<16||pw.length>128)throw Error('16-128 character test password required for '+role);
 }
 if(env.PROOFLINE_COLLECTOR_EMAIL.toLowerCase()===env.PROOFLINE_REVIEWER_EMAIL.toLowerCase())throw Error('Separate collector and reviewer mailboxes required');
 if(env.PROOFLINE_COLLECTOR_PASSWORD===env.PROOFLINE_REVIEWER_PASSWORD)throw Error('Separate collector and reviewer passwords required');
 return env;
}
export async function requestConfirmations(fetcher,env,report=()=>{}){
 validate(env);
 for(const role of ['collector','reviewer']){
  const upper=role.toUpperCase();
  const controller=new AbortController();
  const t=setTimeout(()=>controller.abort(),12000);
  let response;
  try{
   response=await fetcher(STAGING+'/auth/v1/signup',{
    method:'POST',redirect:'error',signal:controller.signal,
    headers:{
     apikey:env.SUPABASE_PUBLISHABLE_KEY,
     'content-type':'application/json',accept:'application/json'
    },
    body:JSON.stringify({
     email:env['PROOFLINE_'+upper+'_EMAIL'],
     password:env['PROOFLINE_'+upper+'_PASSWORD']
    })
   });
  }finally{clearTimeout(t)}
  if(response.status!==200&&response.status!==201){
   throw Error('Official Auth signup not accepted for '+role+' (HTTP '+response.status+'); account state unverified');
  }
  // Email enumeration protection means a 200/201 cannot prove a real user
  // was created. Never treat response user identifiers as authorization.
  report('Signup confirmation request accepted for '+role+' (email verification still required)');
 }
 return {confirmationRequestsAccepted:2,accountsVerified:false,membershipsCreated:false};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 if(process.argv.length!==3||process.argv[2]!=='--request-confirmations'){
  console.error('No network calls made. To request two confirmation emails: node proofline-stage/ci/request_official_test_signups.mjs --request-confirmations');
  process.exitCode=2;
 }else{
  try{
   const result=await requestConfirmations(fetch,process.env,s=>console.log(s));
   console.log('Confirmation requests:',result.confirmationRequestsAccepted,'; verify mailboxes in official Supabase Auth before enrollment.');
  }catch(error){console.error('Fail closed: '+error.message);process.exitCode=1}
 }
}
