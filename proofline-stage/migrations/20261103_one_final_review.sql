-- Applied to Proofline's dedicated private staging database.
-- Prevents duplicate and conflicting reviewer decisions on one evidence item,
-- including simultaneous requests from different reviewer sessions.
CREATE UNIQUE INDEX IF NOT EXISTS proofline_one_review_per_evidence
ON proofline_private.custody_events(tenant_id,reviewed_evidence_id)
WHERE kind='review';
