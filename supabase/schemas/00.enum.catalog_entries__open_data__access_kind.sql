-- How an open data catalog entry's rows are reached. `pipeline_parquet` is a
-- Parquet object a separately-run pipeline produced and uploaded;
-- `api_resource` is a resource an external data API serves, fetched on demand.
-- Every entry is exactly one of these, and the per-kind CHECK constraints on
-- `catalog_entries__open_data` are what keep the two shapes from blurring.
create type public.catalog_entries__open_data__access_kind as enum('pipeline_parquet', 'api_resource');
