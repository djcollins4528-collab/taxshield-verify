SELECT jsonb_build_object(
 'tables',(SELECT jsonb_agg(jsonb_build_array(c.relname,c.relrowsecurity,c.relforcerowsecurity) ORDER BY c.relname)
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='proofline_private' AND c.relkind='r'),
 'columns',(SELECT jsonb_agg(jsonb_build_array(table_name,column_name,data_type,is_nullable,column_default) ORDER BY table_name,ordinal_position)
 FROM information_schema.columns WHERE table_schema='proofline_private'),
 'constraints',(SELECT jsonb_agg(jsonb_build_array(c.relname,k.conname,pg_get_constraintdef(k.oid)) ORDER BY c.relname,k.conname)
 FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='proofline_private'),
 'triggers',(SELECT jsonb_agg(jsonb_build_array(c.relname,t.tgname,pg_get_triggerdef(t.oid)) ORDER BY c.relname,t.tgname)
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='proofline_private' AND NOT t.tgisinternal),
 'policies',(SELECT jsonb_agg(jsonb_build_array(tablename,policyname,permissive,roles,cmd,qual,with_check) ORDER BY tablename,policyname)
 FROM pg_policies WHERE schemaname='proofline_private'),
 'functions',(SELECT jsonb_agg(jsonb_build_array(p.proname,pg_get_function_identity_arguments(p.oid),md5(replace(pg_get_functiondef(p.oid),chr(13)||chr(10),chr(10))),p.prosecdef,p.proconfig) ORDER BY p.proname,pg_get_function_identity_arguments(p.oid))
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='proofline_private'),
 'grants',(SELECT jsonb_agg(jsonb_build_array(table_name,grantee,privilege_type) ORDER BY table_name,grantee,privilege_type)
 FROM information_schema.table_privileges WHERE table_schema='proofline_private')
) AS inventory;

