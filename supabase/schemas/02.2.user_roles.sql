-- Table: user_roles
create table public.user_roles (
  -- Primary key
  id uuid primary key default gen_random_uuid(),

  -- Workspace this membership belongs to
  workspace_id uuid not null
    references public.workspaces(id)
    on update cascade
    on delete cascade,

  -- User who is a member of the workspace
  user_id uuid not null
    references auth.users(id)
    on update cascade
    on delete cascade,

  -- Membership this role belongs to
  membership_id uuid not null
    references public.workspace_memberships(id)
    on update cascade
    on delete cascade,

  -- Role of the user in the workspace (admin, member, etc.)
  role text not null,

  -- Timestamp when the membership was created
  created_at timestamptz not null default now(),

  -- Timestamp for last update
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
comment on table public.user_roles is
  'Stores roles for a user in a workspace.';

-- Column documentation
comment on column public.user_roles.id is
  'Unique identifier for the user role.';
comment on column public.user_roles.workspace_id is
  'Workspace this membership belongs to. References workspaces(id).';
comment on column public.user_roles.user_id is
  'User who is a member of the workspace. References auth.users(id).';
comment on column public.user_roles.membership_id is
  'Membership this role belongs to. References workspace_memberships(id).';
comment on column public.user_roles.role is
  'Role of the user in the workspace (admin, member, etc.).';
comment on column public.user_roles.created_at is
  'Timestamp when the membership was created.';
comment on column public.user_roles.updated_at is
  'Timestamp of last update.';

-- Indexes to improve performance
create index idx_user_roles__user_id_workspace_id on public.user_roles(user_id, workspace_id);

-- Enable row level security
alter table public.user_roles enable row level security;

-- Function: prevent changes to user_id, workspace_id, and membership_id
create or replace function user_roles__prevent_id_changes()
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

-- Trigger: prevent `user_id`, `workspace_id`, and `membership_id` changes on update
create trigger tr_user_roles__prevent_id_changes
  before update on public.user_roles
  for each row execute function user_roles__prevent_id_changes();

-- Trigger: update `updated_at` on row modification
create trigger tr_user_roles__set_updated_at
  before update on public.user_roles
  for each row
  execute function public.util__set_updated_at();
