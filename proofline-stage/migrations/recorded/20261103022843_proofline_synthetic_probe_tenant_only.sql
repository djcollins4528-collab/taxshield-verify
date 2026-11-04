INSERT INTO proofline_private.tenants(id,slug,environment)
VALUES ('bbbbaaaa-1111-4111-8111-000000000001','proofline-synthetic-db-probe','staging')
ON CONFLICT (id) DO NOTHING;
