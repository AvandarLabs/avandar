-- TODO(jpsyx): this table can be removed. With the refactored user_roles table
-- and other policies, it is safe to delete this table
create table public.workspace_memberships (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Timestamp when the membership was created
  created_at timestamptz not null default now(),
  -- Timestamp of the last update to the membership row
  updated_at timestamptz not null default now(),
  -- Workspace this membership belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- User who is a member of the workspace
  user_id uuid not null references auth.users (id) on update cascade on delete cascade,
  -- Role group whose role_group_app_roles rows define per-app role levels
  role_group_id uuid references public.role_groups (id) on update cascade on delete restrict,
  -- Constraint: Each user can be a member of a workspace only once. This
  -- prevents a user from getting added multiple times to the same workspace.
  constraint workspace_memberships__workspace_user_unique unique (workspace_id, user_id)
);

-- Enable row level security
alter table public.workspace_memberships enable row level security;

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_workspace_memberships__set_updated_at before
update on public.workspace_memberships for each row
execute function public.util__set_updated_at ();

-- Indexes to improve performance
create index idx_workspace_memberships__workspace_id on public.workspace_memberships (workspace_id);

create index idx_workspace_memberships__user_id_workspace_id on public.workspace_memberships (user_id, workspace_id);

create index idx_workspace_memberships__role_group_id on public.workspace_memberships (role_group_id);
