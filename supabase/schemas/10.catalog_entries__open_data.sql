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
  -- Name of the parquet dataset in storage
  parquet_file_name text not null,
  -- Display name of the dataset to be shown in the data catalog UI
  display_name text not null,
  -- Name of the pipeline that syncs this dataset
  pipeline_name text not null,
  -- ID of the pipeline run that synced this dataset
  pipeline_run_id text not null,
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
  constraint unique_parquet_file_pipeline unique (
    parquet_file_name,
    pipeline_name
  )
);

-- Enable row level security
alter table public.catalog_entries__open_data enable row level security;

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
