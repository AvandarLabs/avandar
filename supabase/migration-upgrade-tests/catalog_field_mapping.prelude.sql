-- The catalog as it was before organization levels: the listings table with
-- `external_organization_name` and none of the new columns, and no drives
-- table. Then a listing of each kind, which the migration must keep. The
-- identifiers are `pgtap-fixture`-prefixed.
begin;

-- What this migration builds over the old shape, removed first: the search
-- column that reads the new columns, and the RPCs with their new signatures.
-- The migration drops the old versions with `if exists`, so it replays
-- cleanly without them.
alter table public.data_catalog_listings drop column search_vector;

drop function public.rpc_data_catalog_listings__search (text, integer, integer, text[], text[], text[], text[]);

drop function public.rpc_data_catalog_listings__search_facets (text, text[], text[], text[], text[]);

alter table public.data_catalog_listings
  drop column drive_id,
  drop column organization2_name,
  drop column organization3_name,
  drop column organization4_name,
  drop column domains,
  drop column tags,
  drop column source_metadata;

drop table public.data_catalog_drives;

alter table public.data_catalog_listings
  rename column organization1_name to external_organization_name;

insert into public.data_catalog_listings
  (display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format)
values
  ('pgtap-fixture api', 'City of New York', 'api_resource', 'socrata',
   'https://pgtap-fixture.invalid', 'pgtap-fixture-rename',
   'pgtap-fixture-rename', 'CSV');

insert into public.data_catalog_listings
  (display_name, external_organization_name, parquet_file_name,
   pipeline_name, pipeline_run_id)
values
  ('pgtap-fixture parquet', 'World Bank', 'pgtap-fixture-rename.parquet',
   'pgtap-fixture-pipeline', 'run-1');
