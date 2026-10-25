-- API listings the way the drive-index pipelines wrote them before an API
-- listing could name its pipeline: `pipeline_name` is null on every one. The
-- identifiers are `pgtap-fixture`-prefixed so they cannot collide with rows a
-- real pipeline wrote to this database.
begin;

insert into public.data_catalog_listings
  (display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format)
values
  ('pgtap-fixture socrata', 'City of New York', 'api_resource', 'socrata',
   'https://data.cityofnewyork.us', 'pgtap-fixture-socrata',
   'pgtap-fixture-socrata', 'CSV'),
  ('pgtap-fixture hdx', 'HDX', 'api_resource', 'ckan',
   'https://data.humdata.org', 'pgtap-fixture-hdx',
   'pgtap-fixture-hdx-resource', 'CSV'),
  ('pgtap-fixture other ckan', 'Elsewhere', 'api_resource', 'ckan',
   'https://pgtap-fixture.invalid', 'pgtap-fixture-other',
   'pgtap-fixture-other-resource', 'CSV');

-- A Socrata API listing a pipeline already claimed: the backfill must keep its
-- `pipeline_name` instead of overwriting it.
insert into public.data_catalog_listings
  (display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format,
   pipeline_name, pipeline_run_id)
values
  ('pgtap-fixture claimed socrata', 'City of New York', 'api_resource',
   'socrata', 'https://data.cityofnewyork.us', 'pgtap-fixture-claimed',
   'pgtap-fixture-claimed-resource', 'CSV', 'pgtap-fixture-pipeline',
   'run-1');

insert into public.data_catalog_listings
  (display_name, external_organization_name, parquet_file_name,
   pipeline_name, pipeline_run_id)
values
  ('pgtap-fixture parquet', 'World Bank', 'pgtap-fixture-backfill.parquet',
   'pgtap-fixture-pipeline', 'run-1');
