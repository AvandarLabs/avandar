/**
 * Per-member counts of owner-private resources for the workspace privacy log.
 *
 * Security definer because callers cannot read the underlying private rows.
 * This function returns counts only: never add resource names or ids.
 *
 * @param p_workspace_id Workspace to report on.
 * @returns One row per workspace member, including zero-count members.
 */
create or replace function public.rpc_workspaces__private_resource_counts (p_workspace_id uuid) returns table (
  user_id uuid,
  private_dashboard_count bigint,
  private_dataset_count bigint,
  private_map_count bigint
) language plpgsql security definer
set
  search_path = public as $$
#variable_conflict use_column
begin
  if not public.util__can_manage_workspace_settings (p_workspace_id) then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  return query
  with private_dashboards as (
    select d.owner_id, count(*) as resource_count
    from public.dashboards d
    where
      d.workspace_id = p_workspace_id and
      d.is_restricted and
      not d.is_public and
      not public.util__has_non_owner_share (
        'dashboard'::public.resource_type,
        d.id,
        d.workspace_id,
        d.owner_id
      )
    group by d.owner_id
  ),
  private_datasets as (
    select ds.owner_id, count(*) as resource_count
    from public.datasets ds
    where
      ds.workspace_id = p_workspace_id and
      ds.is_restricted and
      not public.util__has_non_owner_share (
        'dataset'::public.resource_type,
        ds.id,
        ds.workspace_id,
        ds.owner_id
      )
    group by ds.owner_id
  ),
  private_maps as (
    select m.owner_id, count(*) as resource_count
    from public.maps m
    where
      m.workspace_id = p_workspace_id and
      m.is_restricted and
      not public.util__has_non_owner_share (
        'map'::public.resource_type,
        m.id,
        m.workspace_id,
        m.owner_id
      )
    group by m.owner_id
  )
  select
    wm.user_id,
    coalesce(pd.resource_count, 0),
    coalesce(pds.resource_count, 0),
    coalesce(pm.resource_count, 0)
  from public.workspace_memberships wm
  left join private_dashboards pd on pd.owner_id = wm.user_id
  left join private_datasets pds on pds.owner_id = wm.user_id
  left join private_maps pm on pm.owner_id = wm.user_id
  where wm.workspace_id = p_workspace_id;
end;
$$;

revoke
execute on function public.rpc_workspaces__private_resource_counts (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_workspaces__private_resource_counts (uuid) to authenticated;
