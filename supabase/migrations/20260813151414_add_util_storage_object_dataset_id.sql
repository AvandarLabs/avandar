set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.util__storage_object_dataset_id(p_object_name text)
 RETURNS uuid
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when split_part(p_object_name, '/', 3) ~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.parquet$'
    then replace(split_part(p_object_name, '/', 3), '.parquet', '')::uuid
    else null
  end;
$function$
;


