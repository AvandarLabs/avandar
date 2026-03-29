-- Table: catalog_entries__dataset_column
-- Represents the link between catalog_entries (open data sources) and their dataset columns
create table if not exists catalog_entries__dataset_column (
  id uuid primary key default gen_random_uuid(),
  catalog_entry_id uuid not null references catalog_entries__open_data (id) on delete cascade,
  -- Name of the column in the dataset
  column_name text not null,
  -- Display order of the column in the dataset
  display_order integer,
  -- Timestamp of when the catalog entry dataset column was created.
  created_at timestamp with time zone default now(),
  -- Timestamp of when this row was last updated.
  updated_at timestamp with time zone default now(),
  -- Original data type from the source data (if specified). Otherwise, this
  -- will default to the DuckDB inferred data type when we parse the dataset.
  -- This value should never be changed, it is an inherent property of the
  -- column. It is intentionally not an enum, because some external data sources
  -- may explicitly specify a data type which might be any string.
  original_data_type text not null,
  -- The data type of the column that we enforced when this column was created
  -- by one of our pipelines. This may differ from the `original_data_type`,
  -- because sometimes a column may need to be cast to a different data type
  -- (e.g. numbers to timestamps) so the column can be more useful in Avandar.
  cast_data_type public.datasets__duckdb_data_type not null
);

-- RLS Policies
alter table catalog_entries__dataset_column enable row level security;

-- Allow everyone to select (read) associations
create policy "User can select catalog dataset columns" on catalog_entries__dataset_column for
select
  using (true);

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_catalog_entries__dataset_column__set_updated_at before
update on catalog_entries__dataset_column for each row
execute function public.util__set_updated_at ();
