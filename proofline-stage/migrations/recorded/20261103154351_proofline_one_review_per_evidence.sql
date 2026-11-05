-- One final independent decision per evidence item, per tenant.
-- A partial unique index serializes concurrent approval attempts safely.
CREATE UNIQUE INDEX IF NOT EXISTS proofline_one_review_per_evidence
ON proofline_private.custody_events (tenant_id, reviewed_evidence_id)
WHERE kind='review';
