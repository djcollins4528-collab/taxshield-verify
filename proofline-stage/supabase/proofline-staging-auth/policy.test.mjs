import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAuthorizationRequest, isValidIdentity, isAuthorizedMembership, decodeVerifiedJwtPayload, matchesVerifiedSessionClaims, isAuthorizedLiveSession, ISSUER, STAGING_TENANT } from './policy.mjs';
const PATH = `https://example.com/functions/v1/proofline-staging-auth/check?tenant=${STAGING_TENANT}&role=collector`;
const TOKEN = 'Bearer ' + 'x'.repeat(100);
const USER = { id:'98798798-9879-4987-8987-987987987987', aud:'authenticated', is_anonymous:false };
const status=(url=PATH,method='GET',auth=TOKEN)=>parseAuthorizationRequest(method,url,auth).status;
test('synthetic tenant allowed',()=>assert.equal(status(),200));
test('method restricted',()=>assert.equal(status(PATH,'POST'),405));
test('route restricted',()=>assert.equal(status(PATH.replace('/check','/evidence')),404));
test('other tenant denied',()=>assert.equal(status(PATH.replace(STAGING_TENANT,USER.id)),403));
test('no bearer denied',()=>assert.equal(status(PATH,'GET',null),401));
test('malformed bearer denied',()=>assert.equal(status(PATH,'GET','Bearer abc'),401));
test('role restricted',()=>assert.equal(status(PATH.replace('role=collector','role=owner')),400));
test('duplicate role denied',()=>assert.equal(status(PATH+'&role=reviewer'),400));
test('extra parameter denied',()=>assert.equal(status(PATH+'&debug=1'),400));
test('valid authenticated user shape',()=>assert.equal(isValidIdentity(USER),true));
test('missing user denied',()=>assert.equal(isValidIdentity(null),false));
test('anonymous user denied',()=>assert.equal(isValidIdentity({...USER,is_anonymous:true}),false));
test('wrong audience denied',()=>assert.equal(isValidIdentity({...USER,aud:'anon'}),false));
test('invalid subject denied',()=>assert.equal(isValidIdentity({...USER,id:'admin'}),false));
test('active membership allowed',()=>assert.equal(isAuthorizedMembership([{allowed:true}]),true));
test('no membership denied',()=>assert.equal(isAuthorizedMembership([]),false));
test('inactive membership denied',()=>assert.equal(isAuthorizedMembership([{allowed:false}]),false));
test('non-boolean permission denied',()=>assert.equal(isAuthorizedMembership([{allowed:1}]),false));

const SESSION='aabbccdd-1122-4333-8444-aabbccddeeff';
const NOW=1800000000;
const CLAIMS={iss:ISSUER,sub:USER.id,aud:'authenticated',role:'authenticated',
 session_id:SESSION,exp:NOW+3600,iat:NOW-60};
const unsignedFixture=(payload)=>'header.'+btoa(JSON.stringify(payload)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')+'.signature';
test('payload decoded only after externally verified Auth token',()=>{
 assert.deepEqual(decodeVerifiedJwtPayload(unsignedFixture(CLAIMS)),CLAIMS);
 assert.equal(matchesVerifiedSessionClaims(decodeVerifiedJwtPayload(unsignedFixture(CLAIMS)),USER,NOW),true);
});
test('malformed payload fails closed',()=>{
 assert.equal(decodeVerifiedJwtPayload('foo..bar'),null);
 assert.equal(decodeVerifiedJwtPayload('foo.a!.bar'),null);
 assert.equal(decodeVerifiedJwtPayload('bad'),null);
});
test('JWT subject must equal verified Supabase user',()=>{
 assert.equal(matchesVerifiedSessionClaims({...CLAIMS,sub:SESSION},USER,NOW),false);
});
test('JWT issuer and audience must match staging',()=>{
 assert.equal(matchesVerifiedSessionClaims({...CLAIMS,iss:'https://attacker.invalid'},USER,NOW),false);
 assert.equal(matchesVerifiedSessionClaims({...CLAIMS,aud:'anon'},USER,NOW),false);
});
test('expired or future-start session claims denied',()=>{
 assert.equal(matchesVerifiedSessionClaims({...CLAIMS,exp:NOW},USER,NOW),false);
 assert.equal(matchesVerifiedSessionClaims({...CLAIMS,nbf:NOW+1},USER,NOW),false);
});
test('missing or invalid session_id denied',()=>{
 assert.equal(matchesVerifiedSessionClaims({...CLAIMS,session_id:undefined},USER,NOW),false);
 assert.equal(matchesVerifiedSessionClaims({...CLAIMS,session_id:'admin'},USER,NOW),false);
});
test('JWT must state authenticated role',()=>{
 assert.equal(matchesVerifiedSessionClaims({...CLAIMS,role:'service_role'},USER,NOW),false);
});
test('live Auth session AND membership both required',()=>{
 assert.equal(isAuthorizedLiveSession([{session_live:true,membership_allowed:true}]),true);
 assert.equal(isAuthorizedLiveSession([{session_live:false,membership_allowed:true}]),false);
 assert.equal(isAuthorizedLiveSession([{session_live:true,membership_allowed:false}]),false);
 assert.equal(isAuthorizedLiveSession([{session_live:false,membership_allowed:false}]),false);
 assert.equal(isAuthorizedLiveSession([{session_live:1,membership_allowed:true}]),false);
 assert.equal(isAuthorizedLiveSession([]),false);
});
