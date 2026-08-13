/**
 * Per-member counts of resources private to that member, for the workspace
 * settings privacy log.
 *
 * Security definer because the caller is forbidden by design from reading the
 * underlying rows: that is the whole point of the private-resource hardening.
 * This function must therefore return counts ONLY. Never add resource names,
 * ids, or any other column.
 *
 * Dashboards additionally require `not is_public`: a public dashboard is
 * world-readable and must never be reported as private, however
 * `is_restricted` is set. See the P1 spec section 4.2.
 *
 * @param p_workspace_id Workspace to report on.
 * @returns One row per workspace member, including members with zero of each.
 */
create or replace function public.rpc_workspaces__private_resource_counts (
  p_workspace_id uuid
) returns table (
  user_id uuid,
  private_dashboard_count bigint,
  private_dataset_count bigint
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
$$;
