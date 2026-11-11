/**
 * A reusable, workspace-level record of what columns mean: entries, and the
 * code lists that translate a column's codes to labels and back. Entries,
 * code lists, and codings are written only through
 * `rpc_data_dictionaries__save`, which bumps `version` once per save.
 */
create table public.data_dictionaries (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this dictionary belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- User id of the owner. A user who still owns a dictionary cannot be
  -- deleted.
  owner_id uuid not null default auth.uid () references auth.users (id) on update cascade on delete no action,
  -- The owner's profile in this workspace
  owner_profile_id uuid not null references public.user_profiles (id) on update cascade on delete no action,
  -- Timestamp of when the dictionary was created
  created_at timestamptz not null default now(),
  -- Timestamp of when the dictionary was last updated
  updated_at timestamptz not null default now(),
  -- Name of the dictionary
  name text not null,
  -- Description of the dictionary
  description text,
  -- Bumped by `rpc_data_dictionaries__save` on every save of entries and
  -- code lists. A dataset converted in place records the version it got.
  version integer not null default 1,
  -- The datasets this dictionary was learned from, for the "Made from"
  -- rail group. Not foreign keys: a deleted dataset leaves an id the rail
  -- skips.
  created_from_dataset_ids uuid[] not null default '{}',
  -- Lets child tables use a composite foreign key that keeps them in the
  -- dictionary's workspace.
  unique (id, workspace_id),
  constraint data_dictionaries__name_not_blank check (btrim(name) <> '')
);

alter table public.data_dictionaries enable row level security;

grant
select
,
  insert,
update,
delete on table public.data_dictionaries to authenticated,
service_role;

create policy "Data Sources viewers can select dictionaries" on public.data_dictionaries for
select
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.data_dictionaries.workspace_id,
      'data_sources'::public.app_type,
      'viewer'::public.role_level
    )
  );

create policy "Data Sources editors can insert dictionaries they own" on public.data_dictionaries for insert to authenticated
with
  check (
    public.data_dictionaries.owner_id = (
      select
        auth.uid ()
    ) and
    public.util__auth_user_meets_min_app_role (
      public.data_dictionaries.workspace_id,
      'data_sources'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "Data Sources editors can update dictionaries" on public.data_dictionaries
for update
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.data_dictionaries.workspace_id,
      'data_sources'::public.app_type,
      'editor'::public.role_level
    )
  )
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.data_dictionaries.workspace_id,
      'data_sources'::public.app_type,
      'editor'::public.role_level
    )
  );

-- An editor deletes their own dictionaries; a Data Sources admin deletes
-- any dictionary in the workspace.
create policy "Owners and Data Sources admins can delete dictionaries" on public.data_dictionaries for delete to authenticated using (
  (
    public.data_dictionaries.owner_id = (
      select
        auth.uid ()
    ) and
    public.util__auth_user_meets_min_app_role (
      public.data_dictionaries.workspace_id,
      'data_sources'::public.app_type,
      'editor'::public.role_level
    )
  ) or
  public.util__auth_user_meets_min_app_role (
    public.data_dictionaries.workspace_id,
    'data_sources'::public.app_type,
    'admin'::public.role_level
  )
);

/** Prevents a dictionary from being reassigned to another workspace. */
create or replace function public.data_dictionaries__prevent_workspace_id_change () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'dictionary workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE.
revoke
execute on function public.data_dictionaries__prevent_workspace_id_change ()
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Refuses direct edits by a signed-in user to the columns this schema
 * manages: the version, which only `rpc_data_dictionaries__save` bumps,
 * and ownership and provenance, which no client flow changes. The save RPC
 * runs as the function owner, so its version bump passes.
 */
create or replace function public.data_dictionaries__guard_managed_columns () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if current_user = 'authenticated' and (
    new.version is distinct from old.version or
    new.owner_id is distinct from old.owner_id or
    new.owner_profile_id is distinct from old.owner_profile_id or
    new.created_from_dataset_ids is distinct from old.created_from_dataset_ids
  ) then
    raise exception 'a dictionary''s version, owner, and sources are managed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke
execute on function public.data_dictionaries__guard_managed_columns ()
from
  public,
  anon,
  authenticated,
  service_role;

/** Ensures a dictionary owner profile belongs to its owner and workspace. */
create or replace function public.data_dictionaries__validate_owner_profile () returns trigger language plpgsql security definer
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
    raise exception 'dictionary owner profile must match owner and workspace'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke
execute on function public.data_dictionaries__validate_owner_profile ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__data_dictionaries__prevent_workspace_id_change before
update of workspace_id on public.data_dictionaries for each row
execute function public.data_dictionaries__prevent_workspace_id_change ();

create trigger tr__data_dictionaries__guard_managed_columns before
update on public.data_dictionaries for each row
execute function public.data_dictionaries__guard_managed_columns ();

create trigger tr__data_dictionaries__validate_owner_profile before insert or
update of owner_id,
owner_profile_id,
workspace_id on public.data_dictionaries for each row
execute function public.data_dictionaries__validate_owner_profile ();

create trigger tr__data_dictionaries__set_updated_at before
update on public.data_dictionaries for each row
execute function public.util__set_updated_at ();

create index idx_data_dictionaries__workspace_owner on public.data_dictionaries (workspace_id, owner_id);

create index idx_data_dictionaries__owner_profile_id on public.data_dictionaries (owner_profile_id);
