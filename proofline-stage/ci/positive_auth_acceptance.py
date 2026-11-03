#!/usr/bin/env python3
"""Opt-in, secret-driven acceptance for two OFFICIAL Supabase Auth test users.
No signup, admin API, credential printing, database modification or billing.
"""
import json,os,urllib.request,urllib.error
BASE='https://pgknyzwctmfqvlivlgpe.supabase.co'
TENANT='bbbbaaaa-1111-4111-8111-000000000001'
OTHER='ccccaaaa-2222-4222-8222-000000000002'
def call(method,path,key,token=None,payload=None):
    headers={'apikey':key,'content-type':'application/json','accept':'application/json'}
    if token:headers['authorization']='Bearer '+token
    data=json.dumps(payload).encode() if payload is not None else None
    req=urllib.request.Request(BASE+path,method=method,headers=headers,data=data)
    try:
        with urllib.request.urlopen(req,timeout=20) as r:return r.status,json.loads(r.read(8192))
    except urllib.error.HTTPError as err:return err.code,{}
def expect(actual,needed,detail):
    if actual!=needed:raise RuntimeError(f'{detail}: expected HTTP {needed}, got {actual}')
def signin(key,email,password):
    status,data=call('POST','/auth/v1/token?grant_type=password',key,payload={'email':email,'password':password})
    expect(status,200,'official Supabase Auth sign-in')
    token=data.get('access_token');user=data.get('user')
    if not isinstance(token,str) or not isinstance(user,dict) or not user.get('id'):
        raise RuntimeError('Supabase Auth did not return a verified user and token')
    return token,user['id']
def check(key,token,role,tenant=TENANT):
    return call('GET',f'/functions/v1/proofline-staging-auth/check?tenant={tenant}&role={role}',key,token)[0]
def run():
    names=['PROOFLINE_PUBLIC_API_KEY','PROOFLINE_COLLECTOR_EMAIL','PROOFLINE_COLLECTOR_PASSWORD',
           'PROOFLINE_REVIEWER_EMAIL','PROOFLINE_REVIEWER_PASSWORD']
    env={name:os.environ.get(name,'') for name in names}
    if any(not env[name] for name in names):raise RuntimeError('Missing test-only credentials; fail closed')
    key=env['PROOFLINE_PUBLIC_API_KEY']
    if not key.startswith('sb_publishable_'):raise RuntimeError('Only public API key permitted')
    if env['PROOFLINE_COLLECTOR_EMAIL'].lower()==env['PROOFLINE_REVIEWER_EMAIL'].lower():
        raise RuntimeError('Two distinct official Auth identities required')
    collector,c_id=signin(key,env['PROOFLINE_COLLECTOR_EMAIL'],env['PROOFLINE_COLLECTOR_PASSWORD'])
    reviewer,r_id=signin(key,env['PROOFLINE_REVIEWER_EMAIL'],env['PROOFLINE_REVIEWER_PASSWORD'])
    if c_id==r_id:raise RuntimeError('Auth identities were not distinct')
    expect(check(key,collector,'collector'),200,'collector correct role')
    expect(check(key,reviewer,'reviewer'),200,'reviewer correct role')
    expect(check(key,collector,'reviewer'),403,'collector reviewer escalation')
    expect(check(key,reviewer,'collector'),403,'reviewer collector escalation')
    expect(check(key,collector,'collector',OTHER),403,'collector cross-tenant')
    expect(check(key,reviewer,'reviewer',OTHER),403,'reviewer cross-tenant')
    print('PASS: official two-user Auth, role separation and cross-tenant denial')
    print('No credentials, tokens, or user IDs printed')
if __name__=='__main__':
    try:run()
    except Exception as err:
        print('FAIL: '+str(err))
        raise SystemExit(1)
