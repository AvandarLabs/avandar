set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.util__is_resource_private_to_owner(p_resource_type public.resource_type, p_resource_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner_id uuid;
  v_is_restricted boolean;
begin
  if p_resource_type = 'dashboard' then
    select
      d.owner_id,
      coalesce(d.is_restricted, false)
    into v_owner_id, v_is_restricted
    from public.dashboards d
    where
      d.id = p_resource_id;
  elsif p_resource_type = 'dataset' then
    select
      ds.owner_id,
      coalesce(ds.is_restricted, false)
    into v_owner_id, v_is_restricted
    from public.datasets ds
    where
      ds.id = p_resource_id;
  else
    return false;
  end if;

  if v_owner_id is null then
    return false;
  end if;

  if not v_is_restricted then
    return false;
  end if;

  return not public.util__has_non_owner_share (
    p_resource_type,
    p_resource_id,
    v_owner_id
  );
end;
$function$
;


