import {validateAppend,validateHistory,verifiedSession} from './policy.mjs';
const ORIGINS=new Set(['https://proofline-assurance-staging.vercel.app','https://proofline-assurance-staging-6zjg9n6ba.vercel.app','https://proofline-assurance-staging-djcollins4528-1987s-projects.vercel.app']);
const MAX_BODY=20000;
// Bound actual streamed bytes, including requests without Content-Length.
async function readBody(req) {
 const declared=req.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>MAX_BODY))return null;
 if(!req.body)return '';
 const reader=req.body.getReader(),chunks=[];let size=0;
 try {
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
   if(size>MAX_BODY){await reader.cancel();return null;}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 } finally {reader.releaseLock();}
}
export function createHandler({authenticate,run,configured}) {
 return async req=>{
  const origin=req.headers.get('origin');
  const cors={'vary':'Origin',...(ORIGINS.has(origin)?{'access-control-allow-origin':origin,'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'authorization, apikey, content-type, x-client-info','access-control-max-age':'600'}:{})};
  const respond=(status,body)=>Response.json(body,{status,headers:{...cors,'cache-control':'private, no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; frame-ancestors 'none'"}});
  if(origin&&!ORIGINS.has(origin))return respond(403,{error:'origin_not_allowed'});
  if(req.method==='OPTIONS')return origin?new Response(null,{status:204,headers:cors}):respond(403,{error:'origin_not_allowed'});
  const url=new URL(req.url),route=url.pathname.split('/').pop();
  if(!['append','history'].includes(route))return respond(404,{error:'not_found'});
  if(req.method!==(route==='append'?'POST':'GET'))return respond(405,{error:'method_not_allowed'});
  const bearer=req.headers.get('authorization');
  if(!bearer||!/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(bearer))return respond(401,{error:'user_bearer_required'});
  let payload;
  if(route==='append') {
   if(url.search)return respond(400,{error:'invalid_request'});
   if((req.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()!=='application/json')return respond(415,{error:'json_required'});
   let raw;try{raw=await readBody(req);}catch{return respond(400,{error:'invalid_json'});}
   if(raw===null)return respond(413,{error:'body_too_large'});
   try{payload=validateAppend(JSON.parse(raw));}catch{}
  } else payload=validateHistory(url);
  if(!payload)return respond(400,{error:'invalid_followup_payload'});
  if(!configured())return respond(503,{error:'staging_not_configured'});
  const token=bearer.slice(7);let identity;
  try{identity=verifiedSession(token,await authenticate(token));}catch{}
  if(!identity)return respond(401,{error:'verified_session_required'});
  try {
   const result=await run(route,payload,identity);
   if(!result)return respond(403,{error:'followup_not_authorized'});
   return respond(route==='append'?201:200,{...result,classification:'SYNTHETIC_STAGING_ONLY',customer_delivery_allowed:false,approval_allowed:false});
  }catch(e){
   if(e?.code==='23505')return respond(409,{error:'followup_conflict_refresh_history'});
   if(['42501','23514','23503','23502'].includes(e?.code))return respond(403,{error:'followup_not_authorized'});
   return respond(503,{error:'followup_unavailable'});
  }
 };
}
