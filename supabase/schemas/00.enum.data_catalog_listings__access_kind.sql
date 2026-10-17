/**
 * How an open data catalog listing's rows are reached.
 *
 * Enum values:
 *
 * `pipeline_parquet` - A Parquet object that a separately-run pipeline
 *  produced and uploaded.
 *
 * `api_resource` - A resource an external data API serves, fetched on demand.
 *
 * Note: Every listing is exactly one of these. The per-kind CHECK constraints
 * on `data_catalog_listings` are what keep the two shapes from
 * blurring.
 */
create type public.data_catalog_listings__access_kind as enum('pipeline_parquet', 'api_resource');
