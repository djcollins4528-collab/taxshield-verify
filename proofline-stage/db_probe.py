"""Fail-closed synthetic database probe for sealed Proofline staging; never commits."""
import os, uuid
from urllib.parse import urlparse,parse_qs

SYNTHETIC_TENANT="bbbbaaaa-1111-4111-8111-000000000001"

def require_secure_dsn(dsn):
    if not isinstance(dsn,str) or not dsn.startswith("postgresql://"):
        raise ValueError("PostgreSQL DSN required")
    u=urlparse(dsn); q=parse_qs(u.query)
    if not all((u.hostname,u.username,u.password,u.path and u.path!="/")):
        raise ValueError("Incomplete database DSN")
    if u.hostname!="db.pgknyzwctmfqvlivlgpe.supabase.co" or u.username!="proofline_stage_login":
        raise ValueError("Unexpected database principal or host")
    if q.get("sslmode")!=["verify-full"] or q.get("sslrootcert")!=["system"]:
        raise ValueError("Strict TLS verification required")
    return dsn

def probe(dsn, connect=None):
    require_secure_dsn(dsn)
    if connect is None:
        import psycopg
        connect=psycopg.connect
    db=connect(dsn,autocommit=False,connect_timeout=8,
               options="-c statement_timeout=8000 -c lock_timeout=3000")
    try:
        with db.cursor() as cur:
            cur.execute("SELECT current_user")
            if cur.fetchone()[0]!="proofline_stage_login":
                raise RuntimeError("Wrong authenticated database user")
            cur.execute("""SELECT has_table_privilege(current_user,'proofline_private.custody_events','INSERT'),
                           has_table_privilege(current_user,'proofline_private.custody_events','UPDATE'),
                           has_table_privilege(current_user,'proofline_private.custody_events','DELETE'),
                           has_table_privilege(current_user,'proofline_private.memberships','SELECT')""")
            if tuple(cur.fetchone())!=(True,False,False,True):
                raise RuntimeError("Staging privileges differ from approved scope")
            cur.execute("SELECT COUNT(*) FROM proofline_private.tenants WHERE id=%s",(SYNTHETIC_TENANT,))
            if cur.fetchone()[0]!=1:raise RuntimeError("Synthetic lab tenant missing")
            cur.execute("SELECT COUNT(*) FROM proofline_private.custody_events WHERE tenant_id=%s",(SYNTHETIC_TENANT,))
            if cur.fetchone()[0]!=0:raise RuntimeError("Synthetic tenant contains unexpected data")
            cur.execute("""INSERT INTO proofline_private.custody_events
                 (tenant_id,seq,id,kind,actor,role,at,nonce,sealed,prev,digest)
                 VALUES (%s,1,%s,'evidence','stage-probe','collector',now(),%s,%s,'GENESIS',%s)""",
                 (SYNTHETIC_TENANT,str(uuid.uuid4()),b"x"*12,b"x"*32,"a"*64))
            cur.execute("SELECT COUNT(*) FROM proofline_private.custody_events WHERE tenant_id=%s",(SYNTHETIC_TENANT,))
            if cur.fetchone()[0]!=1:raise RuntimeError("Synthetic insert not visible inside transaction")
        return True
    finally:
        try:db.rollback()
        finally:db.close()

if __name__=="__main__":
    probe(os.environ.get("PROOFLINE_POSTGRES_DSN",""))
    print("proofline_db_probe_pass=true",flush=True)
