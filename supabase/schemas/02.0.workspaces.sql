create table public.workspaces (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- User id of the owner.
  --   Raise error if owner is deleted while still connected to a workspace.
  --   This will force us to have to first transfer ownership of the workspace
  --   to another user before deleting the previous owner.
  owner_id uuid not null default auth.uid () references auth.users (id) on update cascade on delete no action,
  -- Name of the workspace
  name text not null,
  -- Unique slug for the workspace
  slug text not null unique,
  -- Timestamp when the workspace was created.
  created_at timestamptz not null default now(),
  -- Timestamp of the last update to the workspace.
  updated_at timestamptz not null default now()
);

-- Enable row level security
alter table public.workspaces enable row level security;

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_workspaces__set_updated_at before
update on public.workspaces for each row
execute function public.util__set_updated_at ();

-- Indexes to improve performance
create index idx_workspaces__owner_id on public.workspaces (
  owner_id
);
