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
  -- The broadest organization this dataset comes from, such as `City of New
  -- York` or `World Bank`. Organization levels nest like administrative
  -- levels; the drive's `data_catalog_drives.organization1_label` says what
  -- this level is called. The number is attached to the word so the app's
  -- camelCase round trip (`organization1Name`) lands back on this column.
  organization1_name text not null,
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
  -- Whether this listing's dataset cannot be loaded, as found when the app
  -- last read a sample of it. Cleared when a later sample is read, or when
  -- a pipeline rewrites the listing after its source changed.
  is_invalid boolean not null default false,
  -- Why the dataset cannot be loaded. Set exactly when `is_invalid` is.
  invalid_dataset_reason public.data_catalog_listings__invalid_dataset_reason,
  -- Whether a workspace can add this listing. A pipeline lists every asset a
  -- drive has, including maps, documents, and files Avandar cannot read yet,
  -- and writes this false for those, so they still show up in the catalog
  -- and link to the original through `source_url`. Unlike `is_invalid`, this
  -- is a product decision made without sampling the data.
  is_workspace_loadable boolean not null default true,
  -- The source's own name for the kind of asset this is, such as Socrata's
  -- `dataset`, `map`, or `file`, or a CKAN resource's `url_type`. Null when
  -- the source gives none.
  source_asset_type text,
  -- Where the asset's bytes can be downloaded, when the source exposes one.
  -- `source_url` is the page a person opens instead.
  source_download_url text,
  -- Deeper organization levels, each inside the one above, such as an
  -- agency, then an office. Null when the source has no such level.
  organization2_name text,
  organization3_name text,
  organization4_name text,
  -- Subject areas the source files the dataset under, such as
  -- `Transportation`.
  domains text[],
  -- The source's free-form keywords.
  tags text[],
  -- The drive that produced this listing. Null on a listing no drive-index
  -- pipeline wrote.
  drive_id uuid references public.data_catalog_drives (id) on delete set null,
  -- Where this listing's Parquet copy stands. Null until a build is first
  -- requested. Only ever set on an `api_resource` listing.
  parquet_cache_status public.data_catalog_listings__parquet_cache_status,
  -- The running build's id. A build may only record its result while this
  -- still names it, so a build that was given up as lost and later finishes
  -- cannot overwrite the build that replaced it. Null when no build runs.
  parquet_cache_build_id uuid,
  -- When the running or last build started. A build that has run too long
  -- is treated as lost and may be claimed again.
  parquet_cache_build_started_at timestamptz,
  -- Why the last build failed, as an open data failure code. Set exactly
  -- when `parquet_cache_status` is `failed`.
  parquet_cache_failure_code text,
  -- The public `opendata` bucket folder holding the Parquet copy, as
  -- `part-00000.parquet` onward, named after the build that wrote it. The
  -- copy columns below are set together or not at all.
  parquet_cache_folder_path text,
  -- How many parts the copy's folder holds.
  parquet_cache_part_count integer,
  -- The source's freshness token when the copy was built. Compared against
  -- a live metadata read to decide whether the copy is stale; never parsed.
  parquet_cache_source_version text,
  -- When the copy was written.
  parquet_cache_built_at timestamptz,
  -- How many rows the copy holds.
  parquet_cache_row_count bigint,
  -- The copy's size in bytes.
  parquet_cache_byte_size bigint,
  -- What catalog search matches words against, weighted by how strongly a
  -- match in each field says this is the listing the user wants: the name
  -- (A), who publishes it and what it is filed under (B), then what it says
  -- about itself (C).
  search_vector tsvector generated always as (
    setweight(
      to_tsvector(
        'english'::regconfig,
        coalesce(display_name, '')
      ),
      'A'
    ) || setweight(
      to_tsvector(
        'english'::regconfig,
        coalesce(organization1_name, '') || ' ' || coalesce(organization2_name, '') || ' ' || coalesce(organization3_name, '') || ' ' || coalesce(organization4_name, '') || ' ' || public.util__text_array_to_text (domains) || ' ' || public.util__text_array_to_text (tags) || ' ' || coalesce(external_service_name, '') || ' ' || coalesce(pipeline_name, '')
      ),
      'B'
    ) || setweight(
      to_tsvector(
        'english'::regconfig,
        coalesce(description, '') || ' ' || coalesce(notes, '')
      ),
      'C'
    )
  ) stored,
  -- What the source record this listing was built from says that no other
  -- column holds, such as a CKAN package's title or a Socrata asset's
  -- owner. A field the pipeline maps to a column is left out, so nothing is
  -- stored twice. Keeps the rest so a later column can be filled from it
  -- without re-crawling. As of the last write that changed another column.
  additional_source_metadata jsonb,
  -- Other listings in the same drive that are usually added with this one,
  -- such as the list of country codes a column holds. Each member is
  -- `{kind, externalDatasetId, apiResourceId, joinOn}` and names its
  -- listing by the API key `data_catalog_listings__api_resource_unique`
  -- covers, together with this listing's `api_service` and `api_base_url`,
  -- because a member may be written before or after this listing is.
  -- `rpc_data_catalog_listings__get_companions` resolves them.
  companion_listings jsonb not null default '[]'::jsonb,
  -- How to read a token that changes when this listing's source changes:
  -- `{url, token}`, where `token` is `{kind: "json-paths", paths}` or
  -- `{kind: "body-sha256"}`. Written by the pipeline, so the `open-data`
  -- edge function and the Parquet copy builder check any API's freshness
  -- with no code of their own for it. Null for a listing whose service has
  -- a built-in check.
  api_freshness_probe jsonb,
  -- When the `open-data` edge function last read this listing's freshness
  -- token, so it reads the source at most once per recheck window however
  -- many workspaces ask.
  parquet_cache_checked_at timestamptz,
  -- The token that read returned.
  parquet_cache_checked_source_version text,
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
      parquet_cache_status is null and
      parquet_cache_folder_path is null
    )
  ),
  -- An API listing names its service, instance, dataset and resource, and
  -- carries no Parquet object. It may name the pipeline that wrote it. Only
  -- a loadable one needs a format, since that is what it is read as: a map
  -- or a link has none.
  constraint data_catalog_listings__api_access_complete check (
    access_kind <> 'api_resource' or
    (
      api_service is not null and
      api_base_url is not null and
      api_resource_id is not null and
      (
        api_resource_format is not null or
        not is_workspace_loadable
      ) and
      external_dataset_id is not null and
      parquet_file_name is null
    )
  ),
  -- A Parquet copy is written whole or not at all.
  constraint data_catalog_listings__parquet_cache_copy_complete check (
    (
      parquet_cache_folder_path is null and
      parquet_cache_part_count is null and
      parquet_cache_source_version is null and
      parquet_cache_built_at is null and
      parquet_cache_row_count is null and
      parquet_cache_byte_size is null
    ) or
    (
      parquet_cache_folder_path is not null and
      parquet_cache_part_count > 0 and
      parquet_cache_source_version is not null and
      parquet_cache_built_at is not null and
      parquet_cache_row_count is not null and
      parquet_cache_byte_size is not null
    )
  ),
  -- Each status carries exactly what it means: a running build has an id
  -- and a start time, a ready listing has a copy, a failed build says why,
  -- and a listing no build was ever requested for carries nothing.
  constraint data_catalog_listings__parquet_cache_status_complete check (
    (
      parquet_cache_status is null and
      parquet_cache_build_id is null and
      parquet_cache_build_started_at is null and
      parquet_cache_failure_code is null and
      parquet_cache_folder_path is null
    ) or
    (
      parquet_cache_status = 'building' and
      parquet_cache_build_id is not null and
      parquet_cache_build_started_at is not null and
      parquet_cache_failure_code is null
    ) or
    (
      parquet_cache_status = 'ready' and
      parquet_cache_build_id is null and
      parquet_cache_folder_path is not null and
      parquet_cache_failure_code is null
    ) or
    (
      parquet_cache_status = 'failed' and
      parquet_cache_build_id is null and
      parquet_cache_failure_code is not null
    )
  ),
  -- A freshness check records when it ran and what it read, together.
  constraint data_catalog_listings__parquet_cache_check_complete check (
    (parquet_cache_checked_at is null) = (parquet_cache_checked_source_version is null)
  ),
  constraint data_catalog_listings__companion_listings_is_array check (
    jsonb_typeof(companion_listings) = 'array'
  ),
  constraint data_catalog_listings__api_freshness_probe_is_object check (
    api_freshness_probe is null or
    jsonb_typeof(api_freshness_probe) = 'object'
  ),
  -- An invalid listing says why, and a valid one carries no reason.
  constraint data_catalog_listings__invalid_reason_complete check (
    is_invalid = (invalid_dataset_reason is not null)
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

-- Serves joining a listing to its drive's labels, and the foreign key's
-- `on delete set null`.
create index data_catalog_listings__drive_id on public.data_catalog_listings (drive_id);

-- Serves catalog search's whole-word matching on `search_vector`.
create index data_catalog_listings__search_vector on public.data_catalog_listings using gin (search_vector);

-- Serves catalog search's partial and misspelled word matching on a
-- listing's name.
create index data_catalog_listings__display_name_trgm on public.data_catalog_listings using gin (display_name extensions.gin_trgm_ops);

-- Serves the catalog's publisher filter, and its second-level filter under a
-- chosen publisher.
create index data_catalog_listings__organization_levels on public.data_catalog_listings (organization1_name, organization2_name);

-- Serves the catalog's topic filter (`domains && ...`).
create index data_catalog_listings__domains on public.data_catalog_listings using gin (domains);

-- Serves the catalog's keyword filter (`tags && ...`).
create index data_catalog_listings__tags on public.data_catalog_listings using gin (tags);

-- Serves the catalog's second-level filter on its own, without a publisher.
create index data_catalog_listings__organization2_name on public.data_catalog_listings (organization2_name);

-- Serves the catalog's format filter. The expression is
-- `data_catalog_listings__search_matches`'s `file_format`: change them
-- together.
create index data_catalog_listings__file_format on public.data_catalog_listings (
  (
    case
      when api_resource_format is not null then upper(api_resource_format)
      when parquet_file_name is not null then 'PARQUET'
    end
  )
);

-- Serves browsing the catalog most recently updated first, and its update
-- filter, so a page reads only the listings it shows. The first expression
-- is `data_catalog_listings__search_matches`'s `last_updated_at`: change them
-- together.
create index data_catalog_listings__last_updated_at on public.data_catalog_listings (
  (
    coalesce(date_of_last_update, date_of_last_sync)
  ) desc nulls last,
  display_name,
  id
);

-- Serves browsing the catalog by name.
create index data_catalog_listings__display_name on public.data_catalog_listings (display_name, id);

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
