-- This represents an open data dataset that exists in the Avandar public open
-- data catalog.
create table public.catalog_entries__open_data (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Timestamp of when the catalog entry was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when this row was last updated.
  updated_at timestamptz not null default now(),
  -- The date the last time this open dataset was synced with its raw
  -- data source.
  date_of_last_sync timestamptz,
  -- The date the last time this open dataset was updated. This is data
  -- provided by the dataset or its API.
  date_of_last_update timestamptz,
  -- Coverage start date of the dataset
  coverage_start_date timestamptz,
  -- Coverage end date of the dataset
  coverage_end_date timestamptz,
  -- Name of the parquet dataset in storage. Null on an `api_resource` entry,
  -- which has no Parquet object because nothing pre-converted it.
  parquet_file_name text,
  -- Display name of the dataset to be shown in the data catalog UI
  display_name text not null,
  -- Name of the pipeline that syncs this dataset. Null on an `api_resource`
  -- entry, which no pipeline produces.
  pipeline_name text,
  -- ID of the pipeline run that synced this dataset. Null on an
  -- `api_resource` entry, for the same reason as `pipeline_name`.
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
  -- Which of the two access shapes below this entry uses. Defaulted, so an
  -- insert written before this column existed still lands on the pipeline
  -- shape it was describing.
  access_kind public.catalog_entries__open_data__access_kind not null default 'pipeline_parquet',
  -- The API protocol to speak. Null unless `access_kind` is `api_resource`.
  api_service public.catalog_entries__open_data__api_service,
  -- Root of the API that serves this resource, e.g. `https://data.humdata.org`.
  -- Part of the API uniqueness key, because the same dataset id on two
  -- instances names two different datasets.
  api_base_url text,
  -- Which resource inside the external dataset this entry describes. Required
  -- for an API entry and never inferred: a CKAN dataset routinely lists a
  -- readme ahead of its data, so "the first resource" is a wrong answer with a
  -- plausible shape. `external_dataset_id` names the dataset that contains it.
  api_resource_id text,
  -- The resource format the API reported when this entry was written, e.g.
  -- `CSV`. Cached so an entry's readability is checkable without a network
  -- call; the live value stays authoritative and a mismatch is an error rather
  -- than a reason to parse the bytes as something else.
  api_resource_format text,
  constraint unique_parquet_file_pipeline unique (parquet_file_name, pipeline_name),
  -- A pipeline entry carries every pipeline column and no API column. The
  -- negative half is what stops a row from setting everything and meaning
  -- nothing.
  constraint catalog_entries__open_data__pipeline_access_complete check (
    access_kind <> 'pipeline_parquet' or
    (
      parquet_file_name is not null and
      pipeline_name is not null and
      pipeline_run_id is not null and
      api_service is null and
      api_base_url is null and
      api_resource_id is null and
      api_resource_format is null
    )
  ),
  -- An API entry names its service, instance, dataset and resource, and
  -- carries no pipeline column.
  constraint catalog_entries__open_data__api_access_complete check (
    access_kind <> 'api_resource' or
    (
      api_service is not null and
      api_base_url is not null and
      api_resource_id is not null and
      api_resource_format is not null and
      external_dataset_id is not null and
      parquet_file_name is null and
      pipeline_name is null and
      pipeline_run_id is null
    )
  ),
  -- Resource bytes are fetched from this host, so it must be TLS. Some CKAN
  -- resources point at upstream APIs over plain HTTP; those are rejected here
  -- rather than downloaded.
  constraint catalog_entries__open_data__api_base_url_is_https check (
    api_base_url is null or
    api_base_url like 'https://%'
  )
);

-- One catalog entry per resource per dataset per API instance. Partial because
-- it is a statement about API entries only; `unique_parquet_file_pipeline`
-- above is the corresponding statement about pipeline entries and is
-- deliberately left as a plain constraint, since the pipeline upsert's
-- `on conflict (parquet_file_name, pipeline_name)` can only infer a
-- non-partial one.
create unique index catalog_entries__open_data__api_resource_unique on public.catalog_entries__open_data (
  api_service,
  api_base_url,
  external_dataset_id,
  api_resource_id
)
where
  access_kind = 'api_resource';

-- Enable row level security
alter table public.catalog_entries__open_data enable row level security;

-- Data API privileges.
--
-- Read-only: the open data catalog is populated by the backend.
grant
select
  on table public.catalog_entries__open_data to authenticated;

grant
select
,
  insert,
update,
delete on table public.catalog_entries__open_data to service_role;

-- Policies
create policy "User can select open data catalog entries" on public.catalog_entries__open_data for
select
  to authenticated using (true);

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_open_data_catalog_entries__set_updated_at before
update on public.catalog_entries__open_data for each row
execute function public.util__set_updated_at ();
