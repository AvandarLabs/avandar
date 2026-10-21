-- Listings the way the `socrata`, `hdx`, and `world-bank__wdi` pipelines
-- wrote them before listings carried scope keys: every one has `{}`. Drives
-- are `.invalid` hosts and other identifiers are `pgtap-fixture`-prefixed,
-- so the seeded checkpoints the assertions read belong to these fixtures
-- only, whatever real rows this database holds.
begin;

insert into public.data_catalog_listings
  (display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format,
   pipeline_name, pipeline_run_id, date_of_last_update)
values
  ('pgtap-fixture hdx csv', 'HDX', 'api_resource', 'ckan',
   'https://pgtap-fixture-hdx.invalid', 'pgtap-fixture-hdx-csv',
   'pgtap-fixture-hdx-csv-r', 'CSV', 'hdx', 'run-1', '2026-10-01T00:00:00Z'),
  ('pgtap-fixture hdx parquet', 'HDX', 'api_resource', 'ckan',
   'https://pgtap-fixture-hdx.invalid', 'pgtap-fixture-hdx-parquet',
   'pgtap-fixture-hdx-parquet-r', 'PARQUET', 'hdx', 'run-1',
   '2026-10-05T00:00:00Z'),
  -- A date later than now is a bad source timestamp, which the seed skips.
  ('pgtap-fixture hdx future', 'HDX', 'api_resource', 'ckan',
   'https://pgtap-fixture-hdx.invalid', 'pgtap-fixture-hdx-future',
   'pgtap-fixture-hdx-future-r', 'CSV', 'hdx', 'run-1',
   '2099-01-01T00:00:00Z'),
  ('pgtap-fixture socrata', 'City of New York', 'api_resource', 'socrata',
   'https://pgtap-fixture-socrata.invalid', 'pgtap-fixture-socrata',
   'pgtap-fixture-socrata-r', 'CSV', 'socrata', 'run-1',
   '2026-09-01T00:00:00Z'),
  -- A drive that already has a checkpoint keeps it.
  ('pgtap-fixture socrata seeded', 'City of New York', 'api_resource',
   'socrata', 'https://pgtap-fixture-socrata-seeded.invalid',
   'pgtap-fixture-socrata-seeded', 'pgtap-fixture-socrata-seeded-r', 'CSV',
   'socrata', 'run-1', '2026-09-09T00:00:00Z'),
  -- A hand-curated listing names no pipeline and gets no scope key.
  ('pgtap-fixture curated', 'Elsewhere', 'api_resource', 'ckan',
   'https://pgtap-fixture-curated.invalid', 'pgtap-fixture-curated',
   'pgtap-fixture-curated-r', 'CSV', null, null, '2026-09-01T00:00:00Z');

-- A listing a scoped pipeline already wrote keeps its keys.
insert into public.data_catalog_listings
  (display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format,
   pipeline_name, pipeline_run_id, pipeline_scope_keys)
values
  ('pgtap-fixture hdx keyed', 'HDX', 'api_resource', 'ckan',
   'https://pgtap-fixture-hdx.invalid', 'pgtap-fixture-hdx-keyed',
   'pgtap-fixture-hdx-keyed-r', 'CSV', 'hdx', 'run-2',
   array['format:csv@2']);

insert into public.data_catalog_listings
  (display_name, external_organization_name, parquet_file_name,
   pipeline_name, pipeline_run_id)
values
  ('pgtap-fixture wdi', 'World Bank', 'pgtap-fixture-scope-seed.parquet',
   'pgtap-fixture-wdi', 'run-1');

insert into public.pipeline_scope_checkpoints
  (pipeline_name, drive_key, scope_key, high_water_mark, pipeline_run_id)
values
  ('socrata', 'https://pgtap-fixture-socrata-seeded.invalid', 'all',
   '2026-01-01T00:00:00Z', 'run-0');
