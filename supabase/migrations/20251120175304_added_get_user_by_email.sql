set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.util__get_user_id_by_email(p_email text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'auth', 'pg_temp'
AS $function$
declare
  v_result uuid;
begin
  select u.id into v_result
    from auth.users as u
    where lower(u.email) = lower(p_email)
    limit 1;
  return v_result;
end;
$function$
;


