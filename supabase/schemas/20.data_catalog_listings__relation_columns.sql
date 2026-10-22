/**
 * One column of a Data Catalog listing. Unlike a `dataset_columns` row (a
 * workspace's own, user-editable column metadata), a relation column
 * describes an unowned catalog listing: it is not editable by any user, only
 * discovered and written by a pipeline, exactly as immutable as the listing
 * it belongs to.
 */
create table if not exists data_catalog_listings__relation_columns (
  id uuid primary key default gen_random_uuid(),
  catalog_listing_id uuid not null references data_catalog_listings (id) on delete cascade,
  -- Name of the column in the relation
  column_name text not null,
  -- Display order of the column in the relation
  display_order integer,
  -- Timestamp of when the relation column was created.
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

-- A listing's columns are read in display order, replaced on every write, and
-- deleted by cascade with their listing, all by `catalog_listing_id`.
create index if not exists data_catalog_listings__relation_columns__listing on public.data_catalog_listings__relation_columns (catalog_listing_id, display_order);

-- RLS Policies
alter table data_catalog_listings__relation_columns enable row level security;

-- Data API privileges.
--
-- Read-only: relation columns are discovered and written by the backend.
grant
select
  on table public.data_catalog_listings__relation_columns to authenticated;

grant
select
,
  insert,
update,
delete on table public.data_catalog_listings__relation_columns to service_role;

-- Any signed-in user may read the catalog's column associations.
--
-- Scoped `to authenticated` rather than left unscoped. An unscoped policy
-- defaults to role `public`, which includes `anon`, so this table was readable
-- by an unauthenticated visitor. Nothing anonymous browses the open data
-- catalog, and the sibling table `data_catalog_listings` is already
-- authenticated-only, so the two now agree.
create policy "User can select catalog listing columns" on data_catalog_listings__relation_columns for
select
  to authenticated using (true);

create trigger tr_data_catalog_listings__relation_columns__set_updated_at before
update on data_catalog_listings__relation_columns for each row
execute function public.util__set_updated_at ();
