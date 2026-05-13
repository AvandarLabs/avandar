create table public.dashboards (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this dashboard belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- User id of the owner. We cannot delete users that still own a dashboard
  owner_id uuid not null default auth.uid () references auth.users (id) on update cascade on delete no action,
  -- User profile id of the owner for this workspace. We cannot
  -- remove users from a workspace if they still own a dashboard.
  owner_profile_id uuid not null references public.user_profiles (id) on update cascade on delete no action,
  -- Timestamp of when the dashboard was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when the dashboard was last updated.
  updated_at timestamptz not null default now(),
  -- Name of the dashboard
  name text not null,
  -- Description of the dashboard
  description text,
  -- Whether the dashboard is public
  is_public boolean not null default false,
  -- Optional unique slug for sharing/dashboard URLs
  slug text,
  -- The dashboard's full config as a JSON blob
  config jsonb not null,
  -- When true, tag-based app roles do not apply; shares still can
  is_restricted boolean not null default false,
  constraint dashboards__workspace_id_slug unique (
    workspace_id,
    slug
  )
);

-- Enable row level security
-- RLS and policies: `17.dashboards_datasets_rls.sql`
-- (after `16.utils__permissions.sql` defines resource helper functions).
alter table public.dashboards enable row level security;

-- Trigger the `updated_at` update
create trigger tr_dashboards__set_updated_at before
update on public.dashboards for each row
execute function public.util__set_updated_at ();

-- Indexes to improve performance
create index idx_dashboards__slug on public.dashboards (slug);
