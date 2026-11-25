/**
 * The secret key for a map's displaced (jittered) points, one row per map.
 *
 * Displacement is a keyed hash of this salt with the layer id and the point's
 * original coordinates, so a published snapshot cannot be reversed to exact
 * locations without it. It lives outside `maps` because every member who can
 * read a map can read its whole row, including members who cannot read the
 * map's datasets. Only members who can edit the map can read the salt.
 *
 * Requires `16.utils.resource-permissions` for the editor check.
 */
create table public.map_jitter_salts (
  -- The map this salt keys. One salt per map.
  map_id uuid primary key references public.maps (id) on update cascade on delete cascade,
  -- The secret key itself
  salt uuid not null default gen_random_uuid()
);

alter table public.map_jitter_salts enable row level security;

-- Data API privileges. `authenticated` can only read: a row is created by
-- the trigger below or by `rpc_maps__get_or_create_jitter_salt`, and no
-- signed-in user may change or delete a salt.
grant
select
  on table public.map_jitter_salts to authenticated;

grant
select
,
  insert,
update,
delete on table public.map_jitter_salts to service_role;

create policy "Map editors can read the map jitter salt" on public.map_jitter_salts for
select
  to authenticated using (
    public.util__auth_user_can_update_resource (
      'map'::public.resource_type,
      public.map_jitter_salts.map_id
    )
  );

/** Gives every new map its own jitter salt. */
create or replace function public.map_jitter_salts__create_for_map () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  insert into public.map_jitter_salts (map_id)
  values (new.id)
  on conflict (map_id) do nothing;

  return new;
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE, so no
-- Data API role needs a grant for the trigger to fire.
revoke
execute on function public.map_jitter_salts__create_for_map ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__maps__create_jitter_salt
after insert on public.maps for each row
execute function public.map_jitter_salts__create_for_map ();
