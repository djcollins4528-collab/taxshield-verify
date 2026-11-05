"""Replay recovered application migrations in a network-isolated disposable PG17.

Uses synthetic Auth table contracts, not a running Supabase Auth service.
The two pg_net extension operations are explicitly excluded on stock PostgreSQL.
Never connects to a hosted database and never runs outbound dispatcher functions.
"""
import json
from pathlib import Path
import subprocess
import time
import uuid
import hashlib
import argparse

ROOT = Path(__file__).resolve().parents[1]
IMAGE = 'postgres@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73'
SKIP = {"20261104033216": "pg_net installation requires Supabase extension image",
        "20261104125203": "pg_net relocation requires Supabase extension image"}
BOOTSTRAP = """
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE ROLE supabase_auth_admin NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,
 is_anonymous boolean DEFAULT false,banned_until timestamptz,raw_app_meta_data jsonb DEFAULT '{}');
CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id),not_after timestamptz);
"""

def verified_migrations(directory):
    manifest=json.loads((directory/'manifest.json').read_text(encoding='utf-8'))
    files=sorted(directory.glob('*.sql'))
    if [p.name for p in files] != [m['file'] for m in manifest['migrations']]:
        raise ValueError('Migration inventory mismatch')
    for path,entry in zip(files,manifest['migrations']):
        digest=hashlib.sha256(path.read_text(encoding='utf-8').encode()).hexdigest()
        if digest != entry['sha256_lf']: raise ValueError('Migration checksum mismatch: '+path.name)
    return files

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--candidate',type=Path,help='Apply one local candidate after baseline catalog comparison')
    args=parser.parse_args()
    name = 'proofline-migration-replay-' + uuid.uuid4().hex[:12]
    report = {'classification': 'SYNTHETIC_LOCAL_ONLY', 'applied': [], 'excluded': SKIP,
              'auth_service_verified': False, 'network_dispatch_verified': False}
    def command(args, **kw):
        return subprocess.run(args, check=True, capture_output=True, text=True, encoding='utf-8', **kw)
    def sql(content):
        return command(['docker','exec','-i',name,'psql','-X','-U','postgres','-v','ON_ERROR_STOP=1','-At'], input=content).stdout.strip()
    try:
        files=verified_migrations(ROOT/'migrations'/'recorded')
        command(['docker','run','--detach','--rm','--name',name,'--network','none',
                 '--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_HOST_AUTH_METHOD=trust',IMAGE])
        for _ in range(60):
            ready=subprocess.run(['docker','exec',name,'pg_isready','-U','postgres'],capture_output=True)
            if ready.returncode == 0: break
            time.sleep(.5)
        else: raise RuntimeError('isolated PostgreSQL did not become ready')
        sql(BOOTSTRAP)
        for path in files:
            if path.name[:14] in SKIP: continue
            sql(path.read_text(encoding='utf-8'))
            report['applied'].append(path.name)
        report['tables'] = int(sql("SELECT count(*) FROM pg_tables WHERE schemaname='proofline_private'"))
        report['rls_enabled'] = int(sql("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='proofline_private' AND c.relkind='r' AND c.relrowsecurity"))
        report['preflight'] = json.loads(sql("SELECT json_agg(t) FROM proofline_private.staging_release_preflight_v1() t"))
        inventory=json.loads(sql((ROOT/'ci'/'schema_inventory.sql').read_text(encoding='utf-8')))
        expected=json.loads((ROOT/'ci'/'live-schema-inventory.json').read_text(encoding='utf-8'))
        report['schema_matches']={key:inventory.get(key)==value for key,value in expected.items()}
        if not all(report['schema_matches'].values()):
            report['schema_differences']={key:{'expected_only':[v for v in expected[key] if v not in inventory[key]],'replay_only':[v for v in inventory[key] if v not in expected[key]]} for key,match in report['schema_matches'].items() if not match}
            raise ValueError('Replayed schema differs from live catalog inventory')
        acceptance=ROOT/'ci'/'replay_acceptance.sql'
        if args.candidate:
            sql(args.candidate.read_text(encoding='utf-8'))
            report['candidate']=str(args.candidate)
        report['acceptance'] = sql(acceptance.read_text(encoding='utf-8'))
        if sql("SELECT to_regclass('proofline_private.finding_followups') IS NOT NULL")=='t':
            report['followup_acceptance']=sql((ROOT/'ci'/'replay_followup_acceptance.sql').read_text(encoding='utf-8'))
        report['status']='PASSED_SCOPED_REPLAY'
    except subprocess.CalledProcessError as exc:
        report['status']='FAILED';report['error']=exc.stderr[-4000:];report['observations']=exc.stdout[-5000:]
    except Exception as exc:
        report['status']='FAILED';report['error']=str(exc)
    finally:
        subprocess.run(['docker','rm','-f',name],capture_output=True)
        target=ROOT/'ci'/'replay-result.json'
        target.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
        print(json.dumps(report,indent=2))
    return 0 if report.get('status')=='PASSED_SCOPED_REPLAY' else 1

if __name__=='__main__': raise SystemExit(main())
