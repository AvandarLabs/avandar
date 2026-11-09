/**
 * Returns a map's jitter salt, creating it first when the map has none yet
 * (a map created before salts existed).
 *
 * Returns null when the caller cannot edit the map, so a viewer can never
 * read the key that undoes a published map's displacement.
 *
 * @param p_map_id The map whose salt to return.
 * @returns The map's salt, or null when the caller cannot edit the map.
 */
create or replace function public.rpc_maps__get_or_create_jitter_salt (p_map_id uuid) returns uuid language plpgsql security definer
set
  search_path = '' as $$
declare
  v_salt uuid;
begin
  if not public.util__auth_user_can_update_resource (
    'map'::public.resource_type,
    p_map_id
  ) then
    return null;
  end if;

  insert into public.map_jitter_salts (map_id)
  values (p_map_id)
  on conflict (map_id) do nothing;

  select s.salt
  into v_salt
  from public.map_jitter_salts s
  where s.map_id = p_map_id;

  return v_salt;
end;
$$;

revoke
execute on function public.rpc_maps__get_or_create_jitter_salt (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_maps__get_or_create_jitter_salt (uuid) to authenticated;
