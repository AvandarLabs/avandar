/**
 * Moves every dashboard, dataset, and map a workspace member owns to a new owner.
 *
 * Locks each selected resource before delegating so a concurrent transfer
 * cannot change its owner between selection and audit logging.
 *
 * @returns The number of resources moved.
 */
create or replace function public.rpc_workspaces__transfer_all_owned_resources (
  p_workspace_id uuid,
  p_from_user_id uuid,
  p_new_owner_id uuid
) returns integer language plpgsql security definer
set
  search_path = public as $$
declare
  v_moved integer := 0;
  v_resource_id uuid;
begin
  if not public.util__can_manage_workspace_settings (p_workspace_id) then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  for v_resource_id in
    select d.id
    from public.dashboards d
    where
      d.workspace_id = p_workspace_id and
      d.owner_id = p_from_user_id
    for update
  loop
    perform public.rpc_resources__transfer_ownership (
      'dashboard'::public.resource_type,
      v_resource_id,
      p_new_owner_id
    );
    v_moved := v_moved + 1;
  end loop;

  for v_resource_id in
    select ds.id
    from public.datasets ds
    where
      ds.workspace_id = p_workspace_id and
      ds.owner_id = p_from_user_id
    for update
  loop
    perform public.rpc_resources__transfer_ownership (
      'dataset'::public.resource_type,
      v_resource_id,
      p_new_owner_id
    );
    v_moved := v_moved + 1;
  end loop;

  for v_resource_id in
    select m.id
    from public.maps m
    where
      m.workspace_id = p_workspace_id and
      m.owner_id = p_from_user_id
    for update
  loop
    perform public.rpc_resources__transfer_ownership (
      'map'::public.resource_type,
      v_resource_id,
      p_new_owner_id
    );
    v_moved := v_moved + 1;
  end loop;

  return v_moved;
end;
$$;

revoke
execute on function public.rpc_workspaces__transfer_all_owned_resources (
  uuid,
  uuid,
  uuid
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_workspaces__transfer_all_owned_resources (
  uuid,
  uuid,
  uuid
) to authenticated;
