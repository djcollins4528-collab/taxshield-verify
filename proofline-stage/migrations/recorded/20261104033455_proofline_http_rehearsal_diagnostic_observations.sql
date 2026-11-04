alter table proofline_private.http_rehearsal_dispatch
 add column if not exists observed_checks jsonb,
 add column if not exists receipt_error_code text;
comment on column proofline_private.http_rehearsal_dispatch.observed_checks is 'Sanitized HTTP status and named assertion results only; never tokens, passwords, or response bodies.';
