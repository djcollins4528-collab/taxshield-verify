CREATE OR REPLACE FUNCTION proofline_private.record_http_rehearsal_v1(p_started_at timestamp with time zone, p_checks jsonb, p_outcome text, p_cleanup boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_count integer;v_pass integer;v_hash text;v_id uuid;
begin
 if p_started_at is null or p_started_at>clock_timestamp()+interval '2 minutes' or p_started_at<clock_timestamp()-interval '15 minutes'
   or jsonb_typeof(p_checks)<>'array' or p_outcome not in ('PASSED_SYNTHETIC_ONLY','FAILED','CLEANUP_INCOMPLETE') or p_cleanup is null
 then raise exception 'invalid HTTP rehearsal metadata' using errcode='22023'; end if;
 v_count:=jsonb_array_length(p_checks);
 if v_count>30 then raise exception 'too many observations' using errcode='22023';end if;
 select count(*)::int into v_pass from jsonb_array_elements(p_checks) c
 where c->>'passed'='true'
   and c->>'name' is not null
   and c->>'status' ~ '^[0-9]{3}$';
 if p_outcome='PASSED_SYNTHETIC_ONLY' and (not p_cleanup or v_count<7 or v_count<>v_pass)
 then raise exception 'synthetic success observations incomplete' using errcode='42501';end if;
 if p_cleanup and exists(select 1 from auth.users) then
   raise exception 'cleanup has not been verified' using errcode='42501';end if;
 v_hash:=encode(extensions.digest(convert_to(p_checks::text,'UTF8'),'sha256'),'hex');
 insert into proofline_private.synthetic_http_rehearsals
 (started_at,checks,observed_count,passed_count,outcome,cleanup_confirmed,observations_sha256)
 values(least(p_started_at,clock_timestamp()),p_checks,v_count,v_pass,p_outcome,p_cleanup,v_hash)
 returning run_id into v_id;
 return v_id;
end $function$
;
