\set ON_ERROR_STOP on

-- Every identifier below is deliberately synthetic and `pgtap-fixture`-prefixed,
-- and the hosts are `.invalid`. This file inserts into a table that real rows
-- also live in, and `unique_parquet_file_pipeline` is enforced across all of
-- them, so a fixture sharing a key with a real catalog entry makes the insert
-- fail. Realistic-looking values are exactly the hazard: an earlier version used
-- the World Bank WDI pipeline's own `series.parquet` / `world-bank__wdi`, which
-- collides with what that pipeline actually writes.

begin;

select plan(17);

-- ---------------------------------------------------------------------------
-- The three pipeline columns become nullable, because only a pipeline-produced
-- entry has a Parquet object and a pipeline run behind it.
-- ---------------------------------------------------------------------------

select col_is_null(
  'public',
  'catalog_entries__open_data',
  'parquet_file_name',
  'parquet_file_name is nullable, so an API-backed entry needs no Parquet object'
);

select col_is_null(
  'public',
  'catalog_entries__open_data',
  'pipeline_name',
  'pipeline_name is nullable, so an API-backed entry needs no pipeline'
);

select col_is_null(
  'public',
  'catalog_entries__open_data',
  'pipeline_run_id',
  'pipeline_run_id is nullable, so an API-backed entry needs no pipeline run'
);

-- ---------------------------------------------------------------------------
-- Back compatibility. An insert written exactly the way the World Bank WDI
-- pipeline writes one, naming no access kind, must keep working and must land
-- on the pipeline kind.
-- ---------------------------------------------------------------------------

select lives_ok(
  $$insert into public.catalog_entries__open_data
      (parquet_file_name, display_name, pipeline_name, pipeline_run_id,
       external_organization_name)
    values ('pgtap-fixture.parquet', 'Series', 'pgtap-fixture-pipeline', 'run-1',
            'World Bank')$$,
  'a pipeline entry inserts without naming access_kind'
);

select is(
  (
    select access_kind::text
    from public.catalog_entries__open_data
    where parquet_file_name = 'pgtap-fixture.parquet'
  ),
  'pipeline_parquet',
  'an entry inserted the old way reads back as the pipeline kind'
);

-- The pipeline upserts with `on conflict (parquet_file_name, pipeline_name)`.
-- That inference needs the unchanged unique constraint: were it converted to a
-- partial index, this statement would fail rather than update.

select lives_ok(
  $$insert into public.catalog_entries__open_data
      (parquet_file_name, display_name, pipeline_name, pipeline_run_id,
       external_organization_name)
    values ('pgtap-fixture.parquet', 'Series v2', 'pgtap-fixture-pipeline', 'run-2',
            'World Bank')
    on conflict (parquet_file_name, pipeline_name)
    do update set display_name = excluded.display_name,
                  pipeline_run_id = excluded.pipeline_run_id$$,
  'the pipeline upsert still infers unique_parquet_file_pipeline'
);

select is(
  (
    select display_name
    from public.catalog_entries__open_data
    where parquet_file_name = 'pgtap-fixture.parquet'
      and pipeline_name = 'pgtap-fixture-pipeline'
  ),
  'Series v2',
  'the upsert updated the existing row rather than being ignored'
);

select is(
  (
    select count(*)
    from public.catalog_entries__open_data
    where parquet_file_name = 'pgtap-fixture.parquet'
      and pipeline_name = 'pgtap-fixture-pipeline'
  ),
  1::bigint,
  'the upsert produced no duplicate row'
);

-- ---------------------------------------------------------------------------
-- API-backed entries. Postgres 15 defaults to NULLS DISTINCT, so any number of
-- these coexist under unique_parquet_file_pipeline with both key columns null.
-- ---------------------------------------------------------------------------

select lives_ok(
  $$insert into public.catalog_entries__open_data
      (display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format)
    values ('Operational Presence', 'OCHA', 'api_resource', 'ckan',
            'https://pgtap-fixture.invalid', 'pgtap-fixture-dataset-a',
            'pgtap-fixture-resource-a', 'CSV')$$,
  'an API entry inserts with no Parquet object and no pipeline'
);

select lives_ok(
  $$insert into public.catalog_entries__open_data
      (display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format)
    values ('Movement Range', 'Meta', 'api_resource', 'ckan',
            'https://pgtap-fixture.invalid', 'pgtap-fixture-dataset-b',
            'pgtap-fixture-resource-b', 'CSV')$$,
  'a second API entry coexists, because null keys are distinct'
);

select throws_ok(
  $$insert into public.catalog_entries__open_data
      (display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format)
    values ('Operational Presence again', 'OCHA', 'api_resource', 'ckan',
            'https://pgtap-fixture.invalid', 'pgtap-fixture-dataset-a',
            'pgtap-fixture-resource-a', 'CSV')$$,
  '23505',
  null,
  'the same resource on the same instance cannot be catalogued twice'
);

select lives_ok(
  $$insert into public.catalog_entries__open_data
      (display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format)
    values ('Operational Presence elsewhere', 'OCHA', 'api_resource', 'ckan',
            'https://pgtap-fixture-other.invalid', 'pgtap-fixture-dataset-a',
            'pgtap-fixture-resource-a', 'CSV')$$,
  'the same dataset and resource id on another CKAN instance is a separate entry'
);

-- ---------------------------------------------------------------------------
-- The per-kind CHECK constraints. Both halves: an incomplete row of a kind is
-- refused, and a row carrying the other kind's columns is refused too.
-- ---------------------------------------------------------------------------

select throws_ok(
  $$insert into public.catalog_entries__open_data
      (display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_format)
    values ('No resource named', 'OCHA', 'api_resource', 'ckan',
            'https://pgtap-fixture.invalid', 'pgtap-fixture-dataset-b', 'CSV')$$,
  '23514',
  null,
  'an API entry that names no resource is refused'
);

select throws_ok(
  $$insert into public.catalog_entries__open_data
      (parquet_file_name, display_name, pipeline_name, pipeline_run_id,
       external_organization_name, api_service)
    values ('pgtap-fixture-other.parquet', 'Mixed', 'pgtap-fixture-pipeline', 'run-3',
            'World Bank', 'ckan')$$,
  '23514',
  null,
  'a pipeline entry carrying an API column is refused'
);

select throws_ok(
  $$insert into public.catalog_entries__open_data
      (display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format)
    values ('Insecure', 'OCHA', 'api_resource', 'ckan',
            'http://pgtap-fixture.invalid', 'pgtap-fixture-dataset-b',
            'pgtap-fixture-resource-b', 'CSV')$$,
  '23514',
  null,
  'an API base URL without TLS is refused'
);

-- ---------------------------------------------------------------------------
-- The catalog stays read-only to the browser. Populating it is the backend's
-- job, so `authenticated` reads and cannot write.
-- ---------------------------------------------------------------------------

set local role authenticated;

-- Asserted on a named row rather than on a row count, so the check states what
-- the select policy actually grants and does not move when the seed does.
select is(
  (
    select display_name
    from public.catalog_entries__open_data
    where api_base_url = 'https://pgtap-fixture.invalid'
      and api_resource_id = 'pgtap-fixture-resource-a'
  ),
  'Operational Presence',
  'authenticated reads an API catalog entry'
);

select throws_ok(
  $$insert into public.catalog_entries__open_data
      (display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format)
    values ('Smuggled', 'Nobody', 'api_resource', 'ckan',
            'https://pgtap-fixture.invalid', 'smuggled', 'smuggled-resource', 'CSV')$$,
  '42501',
  null,
  'authenticated cannot insert a catalog entry'
);

reset role;

select * from finish();

rollback;
