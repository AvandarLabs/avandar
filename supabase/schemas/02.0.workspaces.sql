-- Table: workspaces
create table public.workspaces (
  -- Primary key
  id uuid primary key default gen_random_uuid(),

  -- User id of the owner.
  owner_id uuid not null default auth.uid()
    references auth.users(id)
    on update cascade
    on delete no action,

  -- Name of the workspace
  name text not null,

  -- Unique slug for the workspace
  slug text not null unique,

  -- Timestamp when the workspace was created.
  created_at timestamptz not null default now(),

  -- Timestamp of the last update to the workspace.
  updated_at timestamptz not null default now()
);

comment on table public.workspaces is
  'Stores information about workspaces.';

-- Column documentation
comment on column public.workspaces.id is
  'Unique identifier for the workspace.';
comment on column public.workspaces.owner_id is
  'User ID of the owner. References auth.users(id).';
comment on column public.workspaces.name is
  'Name of the workspace.';
comment on column public.workspaces.slug is
  'Unique slug for the workspace URL.';
comment on column public.workspaces.created_at is
  'Timestamp when the workspace was created.';
comment on column public.workspaces.updated_at is
  'Timestamp of the last update to the workspace.';

-- Trigger: update `updated_at` on row modification
create trigger tr_workspaces__set_updated_at
    before update on public.workspaces
    for each row
    execute function public.util__set_updated_at();

-- Enable row level security
alter table public.workspaces enable row level security;