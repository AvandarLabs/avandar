set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_workspaces__private_resource_counts(p_workspace_id uuid)
 RETURNS TABLE(user_id uuid, private_dashboard_count bigint, private_dataset_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
begin
  if not public.util__can_manage_workspace_settings (p_workspace_id) then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  return query
  select
    wm.user_id,
    (
      select count(*)
      from public.dashboards d
      where
        d.workspace_id = p_workspace_id and
        d.owner_id = wm.user_id and
        not coalesce(d.is_public, false) and
        public.util__is_resource_private_to_owner (
          'dashboard'::public.resource_type,
          d.id
        )
    ),
    (
      select count(*)
      from public.datasets ds
      where
        ds.workspace_id = p_workspace_id and
        ds.owner_id = wm.user_id and
        public.util__is_resource_private_to_owner (
          'dataset'::public.resource_type,
          ds.id
        )
    )
  from public.workspace_memberships wm
  where
    wm.workspace_id = p_workspace_id;
end;
$function$
;


