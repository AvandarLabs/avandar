/**
 * One open data listing published in the Avandar public open data catalog.
 * This row is effectively a union of two types: a pipeline-produced Parquet
 * dataset or an API resource. The `access_kind` column discriminates between
 * the two.
 */
create table public.data_catalog_listings (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Timestamp of when the catalog listing was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when this row was last updated.
  updated_at timestamptz not null default now(),
  -- The date the last time this open dataset was synced with its raw
  -- data source.
  date_of_last_sync timestamptz,
  -- When the source last modified this listing's dataset, as its API reports
  -- it. Incremental pipeline runs resume from `pipeline_scope_checkpoints`,
  -- not from this column. The checkpoint seed migration read its newest
  -- value per pipeline and drive (`api_base_url`) once.
  date_of_last_update timestamptz,
  -- Coverage start date of the dataset
  coverage_start_date timestamptz,
  -- Coverage end date of the dataset
  coverage_end_date timestamptz,
  -- Name of the parquet dataset in storage. Null on an `api_resource`
  -- listing, which has no Parquet object because nothing pre-converted it.
  parquet_file_name text,
  -- Display name of the dataset to be shown in the data catalog UI
  display_name text not null,
  -- Name of the pipeline that last wrote this listing. Null on a listing no
  -- pipeline produces, such as a hand-curated `api_resource` listing.
  pipeline_name text,
  -- ID of the pipeline run that last wrote this listing, when a pipeline wrote
  -- it.
  pipeline_run_id text,
  -- External organization this dataset comes from (e.g. World Bank)
  external_organization_name text not null,
  -- External name of the service, such as the API (e.g. World Bank WDI API)
  external_service_name text,
  -- External identifier of the dataset in the external service, such as
  -- the dataset slug.
  external_dataset_id text,
  -- Source URL of the dataset
  source_url text,
  -- Canonical URLs related to the dataset, such as the dataset's landing page,
  -- the API base URL, the documentation URL.
  canonical_urls text[],
  -- License of the dataset
  license text,
  -- Update frequency of the dataset
  update_frequency text,
  -- Description of the dataset
  description text,
  -- Notes about the dataset
  notes text,
  -- Additional metadata about the dataset
  metadata jsonb,
  -- Which of the two access shapes below this listing uses. Defaulted, so an
  -- insert written before this column existed still lands on the pipeline
  -- shape it was describing.
  access_kind public.data_catalog_listings__access_kind not null default 'pipeline_parquet',
  -- The API protocol to speak. Null unless `access_kind` is `api_resource`.
  api_service public.data_catalog_listings__api_service,
  -- Root of the API that serves this resource, e.g. `https://data.humdata.org`.
  -- Part of the API uniqueness key, because the same dataset id on two
  -- instances names two different datasets.
  api_base_url text,
  -- Which resource inside the external dataset this listing describes.
  -- Required for an API listing and never inferred: a CKAN dataset routinely
  -- lists a readme ahead of its data, so "the first resource" is a wrong
  -- answer with a plausible shape. `external_dataset_id` names the dataset
  -- that contains it.
  api_resource_id text,
  -- The resource format the API reported when this listing was written, e.g.
  -- `CSV`. Cached so a listing's readability is checkable without a network
  -- call; the live value stays authoritative and a mismatch is an error
  -- rather than a reason to parse the bytes as something else.
  api_resource_format text,
  -- Where this listing's cached copy lives in the `open-data-catalog`
  -- bucket, once one has been written. Null until the first successful
  -- fetch. Only ever set on an `api_resource` listing: a `pipeline_parquet`
  -- listing already has a stable Parquet object named by `parquet_file_name`
  -- and never needs a cache.
  cached_object_path text,
  -- The freshness token captured when the cache was last written. Compared
  -- against a live metadata read before serving the cache; never parsed.
  cached_source_version text,
  -- When the cache was last written. Informational only:
  -- cached_source_version is what correctness depends on.
  cached_at timestamptz,
  -- The scopes of `pipeline_name` that produce this listing, in the order
  -- they first wrote it. `@avandar/etl` adds a crawl's scope key when it
  -- writes the row, and pruning a retired scope removes it. Empty on a
  -- listing no scoped pipeline wrote.
  pipeline_scope_keys text[] not null default '{}',
  -- When this listing's relation column types were last verified against
  -- the source's real data. Null when they never were: a pipeline that only
  -- knows column names writes every column as text, and the app infers the
  -- real types from a sample later. A listing is stale when this is older
  -- than `date_of_last_update`.
  date_column_type_last_verified timestamptz,
  constraint unique_parquet_file_pipeline unique (parquet_file_name, pipeline_name),
  -- A pipeline listing carries every pipeline column and no API column. The
  -- negative half is what stops a row from setting everything and meaning
  -- nothing.
  constraint data_catalog_listings__pipeline_access_complete check (
    access_kind <> 'pipeline_parquet' or
    (
      parquet_file_name is not null and
      pipeline_name is not null and
      pipeline_run_id is not null and
      api_service is null and
      api_base_url is null and
      api_resource_id is null and
      api_resource_format is null and
      cached_object_path is null and
      cached_source_version is null and
      cached_at is null
    )
  ),
  -- An API listing names its service, instance, dataset and resource, and
  -- carries no Parquet object. It may name the pipeline that wrote it.
  constraint data_catalog_listings__api_access_complete check (
    access_kind <> 'api_resource' or
    (
      api_service is not null and
      api_base_url is not null and
      api_resource_id is not null and
      api_resource_format is not null and
      external_dataset_id is not null and
      parquet_file_name is null
    )
  ),
  -- A cache is written atomically or not at all: either every column is set,
  -- or every column is null. There is no state where only one has a value.
  constraint data_catalog_listings__cache_complete check (
    (
      cached_object_path is null and
      cached_source_version is null and
      cached_at is null
    ) or
    (
      cached_object_path is not null and
      cached_source_version is not null and
      cached_at is not null
    )
  ),
  -- Resource bytes are fetched from this host, so it must be TLS. Some CKAN
  -- resources point at upstream APIs over plain HTTP; those are rejected here
  -- rather than downloaded.
  constraint data_catalog_listings__api_base_url_is_https check (
    api_base_url is null or
    api_base_url like 'https://%'
  )
);

-- One catalog listing per resource per dataset per API instance. Plain, not
-- partial, for the same reason `unique_parquet_file_pipeline` above is
-- plain: the drive-index pipeline's upsert can only target
-- `on conflict (api_service, api_base_url, external_dataset_id,
-- api_resource_id)`, and Postgres cannot infer a partial index as that
-- conflict's arbiter from a bare column list. This is safe because every
-- `pipeline_parquet` row has `api_service` (along with `api_base_url` and
-- `api_resource_id`) forced `NULL` by
-- `data_catalog_listings__pipeline_access_complete` - `external_dataset_id`
-- is not, but a single `NULL` anywhere in the indexed tuple already exempts
-- the row from a unique-index conflict, so this plain index still only ever
-- constrains `api_resource` rows against each other, exactly as the partial
-- version did.
create unique index data_catalog_listings__api_resource_unique on public.data_catalog_listings (
  api_service,
  api_base_url,
  external_dataset_id,
  api_resource_id
);

-- Serves lookups of one pipeline's listings on one drive (`api_base_url`):
-- listing and pruning a pipeline's scopes, and seeding checkpoints from the
-- newest `date_of_last_update`.
create index data_catalog_listings__pipeline_drive_last_update on public.data_catalog_listings (
  pipeline_name,
  api_base_url,
  date_of_last_update
);

-- Enable row level security
alter table public.data_catalog_listings enable row level security;

-- Data API privileges.
--
-- Read-only: the open data catalog is populated by the backend.
grant
select
  on table public.data_catalog_listings to authenticated;

grant
select
,
  insert,
update,
delete on table public.data_catalog_listings to service_role;

-- Policies
create policy "User can select open data catalog listings" on public.data_catalog_listings for
select
  to authenticated using (true);

create trigger tr_data_catalog_listings__set_updated_at before
update on public.data_catalog_listings for each row
execute function public.util__set_updated_at ();
