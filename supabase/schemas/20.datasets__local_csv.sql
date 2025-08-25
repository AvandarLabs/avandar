create table public.datasets__local_csv (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Dataset this metadata belongs to
  dataset_id uuid not null unique references public.datasets (id) on update cascade on delete cascade,
  -- Workspace this dataset belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Timestamp of when the dataset was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when the dataset was last updated.
  updated_at timestamptz not null default now(),
  -- Delimiter used in the CSV file
  delimiter text not null,
  -- Size of the CSV in bytes
  size_in_bytes integer not null
);

-- Enable row level security
alter table public.datasets__local_csv enable row level security;

-- Policies
create policy "
  User can SELECT datasets__local_csv in their workspace
" on public.datasets__local_csv for
select
  to authenticated using (
    public.datasets__local_csv.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can INSERT datasets__local_csv in their workspace
" on public.datasets__local_csv for insert to authenticated
with
  check (
    public.datasets__local_csv.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can UPDATE datasets__local_csv in their workspace
" on public.datasets__local_csv
for update
  to authenticated using (
    public.datasets__local_csv.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  )
with
  check (
    -- Updated values must still be in the auth user's workspace
    public.datasets__local_csv.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can DELETE datasets__local_csv in their workspace
" on public.datasets__local_csv for delete to authenticated using (
  public.datasets__local_csv.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces ()
    )
  )
);

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_datasets__local_csv__set_updated_at before
update on public.datasets__local_csv for each row
execute function public.util__set_updated_at ();
