create table if not exists proofline_private.custody_events (
tenant_id uuid not null references proofline_private.tenants(id),
seq bigint not null check (seq > 0),
id uuid not null unique,
kind text not null check (kind in ('evidence','review')),
actor text not null,
role text not null check (role in ('collector','reviewer')),
at timestamptz not null,
nonce bytea not null check (octet_length(nonce)=12),
sealed bytea not null check (octet_length(sealed) >= 16),
prev text not null,
digest text not null check (digest ~ '^[0-9a-f]{64}$'),
primary key(tenant_id,seq)
);
create index if not exists custody_events_by_id on proofline_private.custody_events (tenant_id,id);
alter table proofline_private.custody_events enable row level security;
revoke all on proofline_private.custody_events from PUBLIC, anon, authenticated;
