create table public.dataset_columns (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Dataset this column belongs to
  dataset_id uuid not null references public.datasets (id) on update cascade on delete cascade,
  -- Workspace this dataset belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Timestamp of when the dataset column was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when this row was last updated.
  updated_at timestamptz not null default now(),
  -- Original name of the column from the source data. This value should never
  -- be changed, it is an inherent property of the original data. The user is
  -- allowed to rename a column in Avandar, but we will use the `name` field
  -- for that.
  original_name text not null,
  -- Name of the column. This field is user-editable. It can differ from the
  -- `original_name` field if the user renames the column.
  name text not null,
  -- Original data type from the source data (if specified). Otherwise, this
  -- will default to the DuckDB inferred data type when we parse the dataset.
  -- This value should never be changed, it is an inherent property of the
  -- column. It is intentionally not an enum, because some external data sources
  -- may explicitly specify a data type which might be any string.
  original_data_type text not null,
  -- The detected data type of the column, as inferred by DuckDB when parsing
  -- the dataset for the first time. This is an enum of valid DuckDB data types.
  -- This should never change after a dataset is parsed. We use this if we ever
  -- need to re-parse the original dataset, so we can check that the new
  -- dataset's types are consistent with the original detected data types we had
  -- detected. This cannot be manually changed by the user.
  detected_data_type public.datasets__duckdb_data_type not null,
  -- Queryable data type of the column. This may differ from the
  -- `detected_data_type`, because sometimes a column may need to be
  -- cast to a different data type (e.g. numbers to timestamps) to allow
  -- different operations. This value can also be changed manually by the user.
  data_type public.datasets__ava_data_type not null,
  -- Description of the column. This is nullable.
  description text,
  -- Column index (to order them)
  column_idx integer not null
);

-- Enable row level security
alter table public.dataset_columns enable row level security;

-- Policies
create policy "User can select dataset_columns in their workspace" on public.dataset_columns for
select
  to authenticated using (
    public.dataset_columns.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "User can insert dataset_columns in their workspace" on public.dataset_columns for insert to authenticated
with
  check (
    public.dataset_columns.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "User can update dataset_columns in their workspace" on public.dataset_columns
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

create policy "User can delete dataset_columns in their workspace" on public.dataset_columns for delete to authenticated using (
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
