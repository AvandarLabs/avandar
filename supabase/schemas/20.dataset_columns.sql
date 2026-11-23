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

-- Data API privileges.
grant
select
,
  insert,
update,
delete on table public.dataset_columns to authenticated,
service_role;

-- Policies
create policy "User can select dataset_columns in their workspace" on public.dataset_columns for
select
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.dataset_columns.dataset_id,
      'viewer'
    )
  );

-- A Postgres dataset's columns are the only ones its rows route reads from the
-- table it names, through the workspace's saved credential, so adding one
-- also requires `data_sources` editor in the dataset's own workspace, the role
-- that picks that table.
create policy "User can insert dataset_columns in their workspace" on public.dataset_columns for insert to authenticated
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.dataset_columns.dataset_id,
      'editor'
    ) and
    public.datasets__auth_user_may_add_column (public.dataset_columns.dataset_id)
  );

create policy "User can update dataset_columns in their workspace" on public.dataset_columns
for update
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.dataset_columns.dataset_id,
      'editor'
    )
  )
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.dataset_columns.dataset_id,
      'editor'
    )
  );

create policy "User can delete dataset_columns in their workspace" on public.dataset_columns for delete to authenticated using (
  public.util__auth_user_can_access_resource (
    'dataset',
    public.dataset_columns.dataset_id,
    'admin'
  )
);

create trigger tr_dataset_columns__set_updated_at before
update on public.dataset_columns for each row
execute function public.util__set_updated_at ();

/**
 * Refuses renaming a Postgres dataset column's `original_name`, or moving a
 * column into or out of a Postgres dataset or its workspace, whoever makes
 * the change. A Postgres dataset's
 * rows route reads exactly these names from the table the dataset names,
 * through the workspace's saved credential, so editing a column must never
 * be a way to read a different column of that table.
 */
create or replace function public.dataset_columns__prevent_postgres_source_change () returns trigger language plpgsql
set
  search_path = public as $$
begin
  if
    (
      new.original_name is distinct from old.original_name or
      new.dataset_id is distinct from old.dataset_id or
      new.workspace_id is distinct from old.workspace_id
    ) and
    (
      public.datasets__is_postgres_table (old.dataset_id) or
      public.datasets__is_postgres_table (new.dataset_id)
    )
  then
    raise exception 'a Postgres dataset column cannot be renamed at its source'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE, so no
-- Data API role needs a grant for the trigger to fire.
revoke
execute on function public.dataset_columns__prevent_postgres_source_change ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__dataset_columns__prevent_postgres_source_change before
update of original_name,
dataset_id,
workspace_id on public.dataset_columns for each row
execute function public.dataset_columns__prevent_postgres_source_change ();
