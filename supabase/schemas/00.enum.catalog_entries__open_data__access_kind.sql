/**
 * How an open data catalog entry's rows are reached.
 *
 * Enum values:
 *
 * `pipeline_parquet` - A Parquet object that a separately-run pipeline
 *  produced and uploaded.
 *
 * `api_resource` - A resource an external data API serves, fetched on demand.
 *
 * Note: Every entry is exactly one of these. The per-kind CHECK constraints
 * on `catalog_entries__open_data` are what keep the two shapes from blurring.
 */
create type public.catalog_entries__open_data__access_kind as enum('pipeline_parquet', 'api_resource');
