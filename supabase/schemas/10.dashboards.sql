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
  constraint dashboards__workspace_id_slug unique (
    workspace_id,
    slug
  )
);

-- Enable row level security
alter table public.dashboards enable row level security;

-- Policies
create policy "
  User can SELECT dashboards in their workspace
" on public.dashboards for
select
  to authenticated,
  anon using (
    public.dashboards.is_public = true or
    (
      auth.uid () is not null and
      public.dashboards.workspace_id = any (
        array(
          select
            public.util__get_auth_user_workspaces ()
        )
      )
    )
  );

create policy "
  User can INSERT dashboards in their workspace
" on public.dashboards for insert to authenticated
with
  check (
    public.dashboards.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "User can UPDATE dashboards in their workspace" on public.dashboards
for update
  to authenticated using (
    public.dashboards.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  )
with
  check (
    -- Updated row must still be in the auth user's workspace
    public.dashboards.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can DELETE dashboards in their workspace
" on public.dashboards for delete to authenticated using (
  public.dashboards.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces ()
    )
  )
);

-- Trigger the `updated_at` update
create trigger tr_dashboards__set_updated_at before
update on public.dashboards for each row
execute function public.util__set_updated_at ();

-- Indexes to improve performance
create index idx_dashboards__slug on public.dashboards (slug);
