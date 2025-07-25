-- Table: workspace_memberships
create table public.workspace_memberships (
  -- Primary key
  id uuid primary key default gen_random_uuid(),

  -- Timestamp when the membership was created
  created_at timestamptz not null default now(),

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

  -- Constraint: Each user can be a member of a workspace only once. This
  -- prevents a user from getting added multiple times to the same workspace.
  constraint workspace_memberships__workspace_user_unique unique (workspace_id, user_id)
);
comment on table public.workspace_memberships is
  'Stores memberships between a user and a workspace.';

-- Column documentation
comment on column public.workspace_memberships.id is
  'Unique identifier for the workspace membership.';
comment on column public.workspace_memberships.created_at is
  'Timestamp when the workspace membership was created.';
comment on column public.workspace_memberships.workspace_id is
  'Workspace this membership belongs to. References workspaces(id).';
comment on column public.workspace_memberships.user_id is
  'User who is a member of the workspace. References auth.users(id).';

-- Enable row level security
alter table public.workspace_memberships enable row level security;

-- Trigger: update `updated_at` on row modification
create trigger tr_workspace_memberships__set_updated_at
  before update on public.workspace_memberships
  for each row
  execute function public.util__set_updated_at();

-- Indexes to improve performance
create index idx_workspace_memberships__user_id_workspace_id on public.workspace_memberships (user_id, workspace_id);
create index idx_workspace_memberships__workspace_id on public.workspace_memberships (workspace_id);