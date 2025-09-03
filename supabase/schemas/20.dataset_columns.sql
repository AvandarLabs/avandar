create type public.datasets__column_data_type as enum(
  'text',
  'number',
  'date'
);

create table public.dataset_columns (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Dataset this column belongs to
  dataset_id uuid not null references public.datasets (id) on update cascade on delete cascade,
  -- Workspace this dataset belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Timestamp of when the dataset column was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when the dataset column was last updated.
  updated_at timestamptz not null default now(),
  -- Name of the column
  name text not null,
  -- Data type of the column
  data_type public.datasets__column_data_type not null,
  -- Description of the column. This is nullable.
  description text,
  -- Column index (to order them)
  column_idx integer not null
);

-- Enable row level security
alter table public.dataset_columns enable row level security;

-- Policies
create policy "
  User can SELECT dataset_columns in their workspace
" on public.dataset_columns for
select
  to authenticated using (
    public.dataset_columns.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can INSERT dataset_columns in their workspace
" on public.dataset_columns for insert to authenticated
with
  check (
    public.dataset_columns.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can UPDATE dataset_columns in their workspace
" on public.dataset_columns
for update
  to authenticated using (
    public.dataset_columns.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  )
with
  check (
    -- New  values must still be in the auth user's workspace
    public.dataset_columns.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "User can DELETE dataset_columns in their workspace" on public.dataset_columns for delete to authenticated using (
  public.dataset_columns.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces ()
    )
  )
);

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_dataset_columns__set_updated_at before
update on public.dataset_columns for each row
execute function public.util__set_updated_at ();
