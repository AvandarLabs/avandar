-- A `pipeline_parquet` listing's relation columns are read from the Parquet
-- file the pipeline wrote, so their types were verified when the listing was
-- written. `date_column_type_last_verified` is new, so mark the listings that
-- already exist the same way the pipeline marks new ones.
update public.data_catalog_listings
set
  date_column_type_last_verified = coalesce(date_of_last_sync, updated_at)
where
  access_kind = 'pipeline_parquet' and
  date_column_type_last_verified is null;
