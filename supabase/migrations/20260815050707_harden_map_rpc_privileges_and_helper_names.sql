revoke
execute on function public.rpc_resources__transfer_ownership (
  public.resource_type,
  uuid,
  uuid
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_resources__transfer_ownership (
  public.resource_type,
  uuid,
  uuid
) to authenticated;

revoke
execute on function public.rpc_workspaces__private_resource_counts (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_workspaces__private_resource_counts (uuid) to authenticated;

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

alter function public.util__auth_user_may_select_map_grant (
  uuid,
  uuid,
  uuid,
  boolean
)
rename to maps__auth_user_may_select_grant;

alter function public.util__auth_user_may_select_map (uuid)
rename to maps__auth_user_may_select;

create or replace function public.maps__auth_user_may_select (
  p_map_id uuid
) returns boolean language plpgsql security definer stable
set
  search_path = '' as $$
declare
  v_workspace_id uuid;
  v_owner_id uuid;
  v_is_restricted boolean;
begin
  select m.workspace_id, m.owner_id, coalesce(m.is_restricted, false)
  into v_workspace_id, v_owner_id, v_is_restricted
  from public.maps m
  where m.id = p_map_id;

  if v_workspace_id is null or not public.util__auth_user_may_select_resource_base (
    'map'::public.resource_type, p_map_id, v_workspace_id
  ) then
    return false;
  end if;

  return public.maps__auth_user_may_select_grant (
    p_map_id, v_workspace_id, v_owner_id, v_is_restricted
  );
end;
$$;

create or replace function public.maps__owner_id_matches_stored (
  p_map_id uuid,
  p_owner_id uuid
) returns boolean language sql security definer stable
set
  search_path = '' as $$
  select
    m.owner_id = p_owner_id and
    public.maps__auth_user_may_select (p_map_id) and
    public.util__auth_user_can_update_resource ('map', p_map_id)
  from public.maps m
  where m.id = p_map_id;
$$;

revoke
execute on function public.maps__auth_user_may_select_grant (
  uuid,
  uuid,
  uuid,
  boolean
)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.maps__auth_user_may_select (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.maps__auth_user_may_select (uuid) to authenticated;
