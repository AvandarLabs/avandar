create or replace function public.maps__owner_id_matches_stored (
  p_map_id uuid,
  p_owner_id uuid
) returns boolean language sql security definer stable
set
  search_path = public as $$
  select
    m.owner_id = p_owner_id and
    public.util__auth_user_may_select_map (p_map_id) and
    public.util__auth_user_can_update_resource ('map', p_map_id)
  from public.maps m
  where m.id = p_map_id;
$$;
