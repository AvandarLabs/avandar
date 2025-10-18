-- This is a valid Avandar data type
create type public.datasets__ava_data_type as enum(
  'boolean',
  'bigint',
  'double',
  'time',
  'date',
  'timestamp',
  'varchar'
);

create type public.datasets__duckdb_data_type as enum(
  'BOOLEAN',
  'TINYINT',
  'SMALLINT',
  'INTEGER',
  'BIGINT',
  'UBIGINT',
  'UTINYINT',
  'USMALLINT',
  'UINTEGER',
  'FLOAT',
  'DOUBLE',
  'DECIMAL',
  'DATE',
  'TIME',
  'TIMESTAMP',
  'TIMESTAMP_TZ',
  'TIMESTAMP WITH TIME ZONE',
  'INTERVAL',
  'VARCHAR',
  'BLOB',
  'UUID',
  'HUGEINT',
  'BIT',
  'ENUM',
  'MAP',
  'STRUCT',
  'LIST',
  'UNION',
  'JSON',
  'GEOMETRY'
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
  -- Original data type from the source data (if specified). Otherwise, this
  -- will default to the DuckDB data type when we parse the dataset.
  -- This value should never be changed, it is an inherent property of the
  -- column. It is intentionally not an enum, because some data sources may come
  -- with metadata about a column's type, which might be any string.
  original_data_type text not null,
  -- The detected data type of the column, as inferred by DuckDB when parsing
  -- the dataset for the first time. This is an enum of valid DuckDB data types.
  -- This should never change after a dataset is parsed. We use this if we ever
  -- need to re-parse a dataset, so we can check that the new dataset's types
  -- are consistent with the original detected data types. This cannot be
  -- manually changed by the user.
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
