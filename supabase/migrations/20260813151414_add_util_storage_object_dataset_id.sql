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

CREATE OR REPLACE FUNCTION public.util__auth_user_can_access_resource_in_workspace(p_resource_type public.resource_type, p_resource_id uuid, p_workspace_id uuid, p_required_role public.role_level)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_resource_workspace_id uuid;
begin
  if p_resource_type = 'dashboard' then
    select d.workspace_id into v_resource_workspace_id
    from public.dashboards d
    where d.id = p_resource_id;
  elsif p_resource_type = 'dataset' then
    select ds.workspace_id into v_resource_workspace_id
    from public.datasets ds
    where ds.id = p_resource_id;
  else
    return false;
  end if;

  return
    v_resource_workspace_id = p_workspace_id and
    public.util__auth_user_can_access_resource (
      p_resource_type,
      p_resource_id,
      p_required_role
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__storage_object_workspace_id(p_object_name text)
 RETURNS uuid
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when split_part(p_object_name, '/', 1) ~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then split_part(p_object_name, '/', 1)::uuid
    else null
  end;
$function$
;
