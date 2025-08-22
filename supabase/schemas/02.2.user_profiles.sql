-- Table: user_profiles
create table public.user_profiles (
  -- Primary key
  id uuid primary key default gen_random_uuid(),

  -- Timestamp when the profile was created
  created_at timestamptz not null default now(),

  -- Timestamp for last update
  updated_at timestamptz not null default now(),

  -- User this profile belongs to
  user_id uuid not null
    references auth.users(id)
    on update cascade
    on delete cascade,

  -- Workspace this profile belongs to
  workspace_id uuid not null
    references public.workspaces(id)
    on update cascade
    on delete cascade,

  -- membership this profile belongs to
  membership_id uuid not null
    references public.workspace_memberships(id)
    on update cascade
    on delete cascade,

  -- The user's full name
  full_name text not null,

  -- The user's preferred display name (nickname, handle, etc.)
  display_name text not null
);
comment on table public.user_profiles is
  'Stores profiles for a user in a workspace.';
  
-- Column documentation
comment on column public.user_profiles.id is
  'Unique identifier for the user profile.';
comment on column public.user_profiles.created_at is
  'Timestamp when the user profile was created.';
comment on column public.user_profiles.updated_at is
  'Timestamp of last update.';
comment on column public.user_profiles.user_id is
  'User this profile belongs to. References auth.users(id).';
comment on column public.user_profiles.workspace_id is
  'Workspace this profile belongs to. References workspaces(id).';
comment on column public.user_profiles.membership_id is
  'Membership this profile belongs to. References workspace_memberships(id).';
comment on column public.user_profiles.full_name is
  'The full name of the user.';
comment on column public.user_profiles.display_name is
  'The preferred display name of the user.';

-- Enable row level security
alter table public.user_profiles enable row level security;

-- Indexes to improve performance
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
