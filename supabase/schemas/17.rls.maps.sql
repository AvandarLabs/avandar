/**
 * RLS for `maps`. Requires `16.utils.resource-permissions`.
 *
 *  Resource CRUD matrix (effective role on the row):
 *    viewer: SELECT
 *    editor: SELECT, INSERT (new row in workspace), UPDATE
 *    admin: SELECT, INSERT, UPDATE, DELETE
 *
 *  SELECT also uses `util__auth_user_may_select_map` so workspace editors
 * cannot read other members' unrestricted rows without an explicit share.
 *
 *  There is deliberately NO anon policy. `maps.is_public` is reserved for a
 * future public embed; until that route and its pgTAP coverage exist, a map
 * is not readable without authenticating.
 */
/** Checks that an ordinary update keeps the persisted map owner unchanged. */
create or replace function public.maps__owner_id_matches_stored (
  p_map_id uuid,
  p_owner_id uuid
) returns boolean language sql security definer stable
set
  search_path = '' as $$
  select
    m.owner_id = p_owner_id and
    public.util__auth_user_may_select_map (p_map_id) and
    public.util__auth_user_can_update_resource ('map', p_map_id)
  from public.maps m
  where m.id = p_map_id;
$$;

revoke
execute on function public.maps__owner_id_matches_stored (
  uuid,
  uuid
)
from
  public,
  anon,
  service_role;

grant
execute on function public.maps__owner_id_matches_stored (
  uuid,
  uuid
) to authenticated;

-- The inline owner short-circuit lets the row owner pass SELECT RLS without the
-- helper re-fetching the row. Required so `INSERT ... RETURNING *` works for
-- the inserting user: during INSERT, the helper's internal SELECT cannot see
-- the just-inserted row and would otherwise return false.
create policy "Users can read maps they have permissions for" on public.maps for
select
  to authenticated using (
    public.maps.owner_id = (
      select
        auth.uid ()
    ) or
    public.util__auth_user_may_select_map (
      public.maps.id
    )
  );

create policy "Users with editor app role can insert maps" on public.maps for insert to authenticated
with
  check (
    public.util__auth_user_can_insert_workspace_resource (
      public.maps.workspace_id,
      'map'::public.resource_type,
      public.maps.owner_id
    )
  );

create policy "Users with editor access can update maps" on public.maps
for update
  to authenticated using (
    public.util__auth_user_can_update_resource (
      'map'::public.resource_type,
      public.maps.id
    )
  )
with
  check (
    public.util__auth_user_can_update_resource (
      'map'::public.resource_type,
      public.maps.id
    ) and
    public.maps__owner_id_matches_stored (
      public.maps.id,
      public.maps.owner_id
    ) and
    public.maps.owner_id = any (
      array(
        select
          public.util__get_workspace_members (
            public.maps.workspace_id
          )
      )
    )
  );

create policy "Users with admin access can delete maps" on public.maps for delete to authenticated using (
  public.util__auth_user_can_delete_resource (
    'map'::public.resource_type,
    public.maps.id
  )
);
