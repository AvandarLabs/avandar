create table public.user_profiles (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Timestamp when the profile was created
  created_at timestamptz not null default now(),
  -- Timestamp for last update
  updated_at timestamptz not null default now(),
  -- User this profile belongs to
  user_id uuid not null references auth.users (id) on update cascade on delete cascade,
  -- Workspace this profile belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- membership this profile belongs to
  membership_id uuid not null unique references public.workspace_memberships (id) on update cascade on delete cascade,
  -- The user's full name
  full_name text not null,
  -- The user's preferred display name (nickname, handle, etc.)
  display_name text not null
);

-- Enable row level security
alter table public.user_profiles enable row level security;

/**
 * Prevent changes to user_id, workspace_id, and membership_id
 * This function must be used in a trigger.
 */
create or replace function user_profiles__prevent_id_changes () returns trigger as $$
begin
  if new.user_id <> old.user_id or new.workspace_id <> old.workspace_id or
    new.membership_id <> old.membership_id then
    raise exception 'user_id, workspace_id, and membership_id cannot be changed';
  end if;
  return new;
end;
$$ language plpgsql;

/**
 * Trigger the `user_profiles__prevent_id_changes` function to make sure
 * that certain protected ids do not get changed.
 */
create trigger tr_user_profiles__prevent_id_changes before
update on public.user_profiles for each row
execute function user_profiles__prevent_id_changes ();

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_user_profiles__set_updated_at before
update on public.user_profiles for each row
execute function public.util__set_updated_at ();

-- Indexes to improve performance
<<<<<<< HEAD
create index idx_user_profiles__user_id_workspace_id on public.user_profiles(user_id, workspace_id);

-- Function: prevent changes to user_id, workspace_id, and membership_id
create or replace function user_profiles__prevent_id_changes()
returns trigger as $$
  begin
    if new.user_id <> old.user_id or
      new.workspace_id <> old.workspace_id or
      new.membership_id <> old.membership_id then
      raise exception 'user_id, workspace_id, and membership_id cannot be changed';
    end if;
    return new;
  end;
$$
language plpgsql;

-- One profile per membership
alter table public.user_profiles
  add constraint if not exists user_profiles_membership_id_unique
  unique (membership_id);

-- Trigger: prevent `user_id`, `workspace_id`, and `membership_id` changes on update
create trigger tr_user_profiles__prevent_id_changes
  before update on public.user_profiles
  for each row execute function user_profiles__prevent_id_changes();

-- Trigger: update `updated_at` on row modification
create trigger tr_user_profiles__set_updated_at
  before update on public.user_profiles
  for each row
  execute function public.util__set_updated_at();
=======
create index idx_user_profiles__user_id_workspace_id on public.user_profiles (
  user_id,
  workspace_id
);
>>>>>>> develop
