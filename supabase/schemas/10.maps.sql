create table public.maps (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this map belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- User id of the owner. We cannot delete users that still own a map
  owner_id uuid not null default auth.uid () references auth.users (id) on update cascade on delete no action,
  -- User profile id of the owner for this workspace. We cannot
  -- remove users from a workspace if they still own a map.
  owner_profile_id uuid not null references public.user_profiles (id) on update cascade on delete no action,
  -- Timestamp of when the map was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when the map was last updated.
  updated_at timestamptz not null default now(),
  -- Name of the map
  name text not null,
  -- Description of the map
  description text,
  -- Reserved for a future public embed. No policy reads this column: there is
  -- no anon SELECT policy on maps and no public map route, so setting it true
  -- does not expose the row. A future public route must add both access and
  -- pgTAP coverage at the same time.
  is_public boolean not null default false,
  -- Optional unique slug, reserved for the same future public embed
  slug text,
  -- The map's full AvaMapConfig as a JSON blob. Layer-model evolution is a
  -- config version bump plus a parser, not a migration: see
  -- shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts
  config jsonb not null,
  -- When true, tag-based app roles do not apply; shares still can
  is_restricted boolean not null default false
);

-- Enable row level security
-- RLS and policies: `17.rls.maps.sql`
-- (after `16.utils.resource-permissions.sql` defines resource helper
-- functions).
alter table public.maps enable row level security;

-- Data API privileges. `anon` is intentionally omitted: there is no public
-- map route, and dashboards is the only table `anon` can reach.
grant
select
,
  insert,
update,
delete on table public.maps to authenticated;

/** Prevents a map from being reassigned to another workspace. */
create or replace function public.maps__prevent_workspace_id_change () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'map workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

/** Ensures a map owner profile belongs to its owner and workspace. */
create or replace function public.maps__validate_owner_profile () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  if not exists (
    select 1
    from public.user_profiles up
    where
      up.id = new.owner_profile_id and
      up.user_id = new.owner_id and
      up.workspace_id = new.workspace_id
  ) then
    raise exception 'map owner profile must match owner and workspace'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke
execute on function public.maps__validate_owner_profile ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__maps__prevent_workspace_id_change before
update of workspace_id on public.maps for each row
execute function public.maps__prevent_workspace_id_change ();

create trigger tr__maps__validate_owner_profile before insert or
update of owner_id,
owner_profile_id,
workspace_id on public.maps for each row
execute function public.maps__validate_owner_profile ();

-- Trigger the `updated_at` update
create trigger tr__maps__set_updated_at before
update on public.maps for each row
execute function public.util__set_updated_at ();

-- Indexes to improve performance
create index idx_maps__slug on public.maps (slug);

create index idx_maps__workspace_owner on public.maps (workspace_id, owner_id);

create index idx_maps__owner_id on public.maps (owner_id);

create index idx_maps__owner_profile_id on public.maps (owner_profile_id);

-- Globally unique vanity slug for public maps, mirroring dashboards so a
-- future `/m/<slug>` route resolves to at most one map even if a frontend
-- check is bypassed. Inert until a public embed is implemented, like
-- `is_public`.
create unique index maps__slug_unique_when_public on public.maps (slug)
where
  is_public = true and
  slug is not null;
