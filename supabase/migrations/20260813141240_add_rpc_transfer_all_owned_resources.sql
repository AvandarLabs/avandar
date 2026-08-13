set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_workspaces__transfer_all_owned_resources(p_workspace_id uuid, p_from_user_id uuid, p_new_owner_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_moved integer := 0;
  v_row record;
begin
  if not public.util__can_manage_workspace_settings (p_workspace_id) then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  for v_row in
    select 'dashboard'::public.resource_type as resource_type, d.id
    from public.dashboards d
    where
      d.workspace_id = p_workspace_id and
      d.owner_id = p_from_user_id
    union all
    select 'dataset'::public.resource_type, ds.id
    from public.datasets ds
    where
      ds.workspace_id = p_workspace_id and
      ds.owner_id = p_from_user_id
  loop
    perform public.rpc_resources__transfer_ownership (
      v_row.resource_type,
      v_row.id,
      p_new_owner_id
    );
    v_moved := v_moved + 1;
  end loop;

  return v_moved;
end;
$function$
;


