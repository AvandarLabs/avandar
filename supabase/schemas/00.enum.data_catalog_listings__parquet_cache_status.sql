/**
 * Where an API-backed catalog listing's Parquet copy stands.
 *
 * - `building`: the pipeline server is building a copy. A listing being
 *   rebuilt keeps serving its previous copy until the new one is written.
 * - `ready`: the listing has a copy in the `opendata` bucket.
 * - `failed`: the last build failed. A listing that had a copy before it
 *   keeps it.
 */
create type public.data_catalog_listings__parquet_cache_status as enum('building', 'ready', 'failed');
