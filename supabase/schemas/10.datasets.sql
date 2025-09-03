create type public.datasets__source_type as enum(
  'local_csv',
  'google_sheets'
);

create table public.datasets (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Timestamp of when the dataset was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when the dataset was last updated.
  updated_at timestamptz not null default now(),
  -- User id of the owner. We cannot delete users that still own
  -- datasets.
  owner_id uuid not null default auth.uid () references auth.users (id) on update cascade on delete no action,
  -- User profile id of the owner for this workspace. We cannot
  -- remove users from a workspace if they still own datasets.
  owner_profile_id uuid not null references public.user_profiles (id) on update cascade on delete no action,
  -- Workspace this dataset belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- The date of the last sync of the dataset. This is nullable
  -- because, for online datasets, we may have created the
  -- dataset, but never loaded all of its data yet.
  date_of_last_sync timestamptz,
  -- Name of the dataset
  name text not null,
  -- The source of the dataset. E.g. "local_csv" or "google_sheets"
  source_type public.datasets__source_type not null,
  -- Description of the dataset
  description text
);

-- Enable row level security
alter table public.datasets enable row level security;

-- Policies
create policy "
  User can SELECT datasets in their workspace
" on public.datasets for
select
  to authenticated using (
    public.datasets.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can INSERT datasets in their workspace
" on public.datasets for insert to authenticated
with
  check (
    public.datasets.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    ) and
    -- inserted datasets must have auth user as owner
    public.datasets.owner_id = (
      select
        auth.uid ()
    )
  );

create policy "User can UPDATE datasets in their workspace" on public.datasets
for update
  to authenticated using (
    public.datasets.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  )
with
  check (
    -- Updated dataset must still be in the auth user's workspace
    public.datasets.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    ) and
    -- New owner must still be a member of this workspace
    public.datasets.owner_id = any (
      array(
        select
          public.util__get_workspace_members (
            public.datasets.workspace_id
          )
      )
    )
  );

create policy "
  User can DELETE datasets in their workspace
" on public.datasets for delete to authenticated using (
  public.datasets.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces ()
    )
  )
);

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_datasets__set_updated_at before
update on public.datasets for each row
execute function public.util__set_updated_at ();
