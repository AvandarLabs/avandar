\set ON_ERROR_STOP on

-- Every identifier below is deliberately synthetic and `pgtap-fixture`-prefixed,
-- and the hosts are `.invalid`. This file inserts into a table that real rows
-- also live in, and `unique_parquet_file_pipeline` is enforced across all of
-- them, so a fixture sharing a key with a real catalog listing makes the insert
-- fail. Realistic-looking values are exactly the hazard: an earlier version used
-- the World Bank WDI pipeline's own `series.parquet` / `world-bank__wdi`, which
-- collides with what that pipeline actually writes.

begin;

select plan(26);

-- ---------------------------------------------------------------------------
-- The three pipeline columns become nullable. A Parquet pipeline listing must
-- name its pipeline and run, while an API listing may, and has no Parquet
-- object.
-- ---------------------------------------------------------------------------

select col_is_null(
  'public',
  'data_catalog_listings',
  'parquet_file_name',
  'parquet_file_name is nullable, so an API-backed listing needs no Parquet object'
);

select col_is_null(
  'public',
  'data_catalog_listings',
  'pipeline_name',
  'pipeline_name is nullable, so an API-backed listing needs no pipeline'
);

select col_is_null(
  'public',
  'data_catalog_listings',
  'pipeline_run_id',
  'pipeline_run_id is nullable, so an API-backed listing needs no pipeline run'
);

-- ---------------------------------------------------------------------------
-- Back compatibility. An insert written exactly the way the World Bank WDI
-- pipeline writes one, naming no access kind, must keep working and must land
-- on the pipeline kind.
-- ---------------------------------------------------------------------------

select lives_ok(
  $$insert into public.data_catalog_listings
      (parquet_file_name, display_name, pipeline_name, pipeline_run_id,
       external_organization_name)
    values ('pgtap-fixture.parquet', 'Series', 'pgtap-fixture-pipeline', 'run-1',
            'World Bank')$$,
  'a pipeline listing inserts without naming access_kind'
);

select is(
  (
    select access_kind::text
    from public.data_catalog_listings
    where parquet_file_name = 'pgtap-fixture.parquet'
  ),
  'pipeline_parquet',
  'a listing inserted the old way reads back as the pipeline kind'
);

-- The pipeline upserts with `on conflict (parquet_file_name, pipeline_name)`.
-- That inference needs the unchanged unique constraint: were it converted to a
-- partial index, this statement would fail rather than update.

select lives_ok(
  $$insert into public.data_catalog_listings
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
    from public.data_catalog_listings
    where parquet_file_name = 'pgtap-fixture.parquet'
      and pipeline_name = 'pgtap-fixture-pipeline'
  ),
  'Series v2',
  'the upsert updated the existing row rather than being ignored'
);

select is(
  (
    select count(*)
    from public.data_catalog_listings
    where parquet_file_name = 'pgtap-fixture.parquet'
      and pipeline_name = 'pgtap-fixture-pipeline'
  ),
  1::bigint,
  'the upsert produced no duplicate row'
);

-- ---------------------------------------------------------------------------
-- API-backed listings. Postgres 15 defaults to NULLS DISTINCT, so any number of
-- these coexist under unique_parquet_file_pipeline with both key columns null.
-- ---------------------------------------------------------------------------

select lives_ok(
  $$insert into public.data_catalog_listings
      (display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format)
    values ('Operational Presence', 'OCHA', 'api_resource', 'ckan',
            'https://pgtap-fixture.invalid', 'pgtap-fixture-dataset-a',
            'pgtap-fixture-resource-a', 'CSV')$$,
  'an API listing inserts with no Parquet object and no pipeline'
);

select lives_ok(
  $$insert into public.data_catalog_listings
      (display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format)
    values ('Movement Range', 'Meta', 'api_resource', 'ckan',
            'https://pgtap-fixture.invalid', 'pgtap-fixture-dataset-b',
            'pgtap-fixture-resource-b', 'CSV')$$,
  'a second API listing coexists, because null keys are distinct'
);

select throws_ok(
  $$insert into public.data_catalog_listings
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
  $$insert into public.data_catalog_listings
      (display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format)
    values ('Operational Presence elsewhere', 'OCHA', 'api_resource', 'ckan',
            'https://pgtap-fixture-other.invalid', 'pgtap-fixture-dataset-a',
            'pgtap-fixture-resource-a', 'CSV')$$,
  'the same dataset and resource id on another CKAN instance is a separate listing'
);

-- ---------------------------------------------------------------------------
-- The per-kind CHECK constraints. Both halves: an incomplete row of a kind is
-- refused, and a row carrying the other kind's columns is refused too.
-- ---------------------------------------------------------------------------

select throws_ok(
  $$insert into public.data_catalog_listings
      (display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_format)
    values ('No resource named', 'OCHA', 'api_resource', 'ckan',
            'https://pgtap-fixture.invalid', 'pgtap-fixture-dataset-b', 'CSV')$$,
  '23514',
  null,
  'an API listing that names no resource is refused'
);

select throws_ok(
  $$insert into public.data_catalog_listings
      (parquet_file_name, display_name, pipeline_name, pipeline_run_id,
       external_organization_name, api_service)
    values ('pgtap-fixture-other.parquet', 'Mixed', 'pgtap-fixture-pipeline', 'run-3',
            'World Bank', 'ckan')$$,
  '23514',
  null,
  'a pipeline listing carrying an API column is refused'
);

-- ---------------------------------------------------------------------------
-- A drive-index pipeline records itself on the API listings it writes, so
-- `pipeline_name` and `pipeline_run_id` are allowed on an `api_resource` row.
-- They stay optional, because a hand-curated API listing has no pipeline.
-- ---------------------------------------------------------------------------

select lives_ok(
  $$insert into public.data_catalog_listings
      (display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format,
       pipeline_name, pipeline_run_id)
    values ('Pipeline-written API listing', 'OCHA', 'api_resource', 'ckan',
            'https://pgtap-fixture.invalid', 'pgtap-fixture-dataset-p',
            'pgtap-fixture-resource-p', 'CSV',
            'pgtap-fixture-pipeline', 'run-5')$$,
  'an api_resource row may name the pipeline and run that wrote it'
);

select lives_ok(
  $$insert into public.data_catalog_listings
      (display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format)
    values ('Hand-curated API listing', 'OCHA', 'api_resource', 'ckan',
            'https://pgtap-fixture.invalid', 'pgtap-fixture-dataset-q',
            'pgtap-fixture-resource-q', 'CSV')$$,
  'an api_resource row with no pipeline still inserts'
);

select throws_ok(
  $$insert into public.data_catalog_listings
      (display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format,
       parquet_file_name)
    values ('API listing with an object', 'OCHA', 'api_resource', 'ckan',
            'https://pgtap-fixture.invalid', 'pgtap-fixture-dataset-r',
            'pgtap-fixture-resource-r', 'CSV', 'pgtap-fixture-r.parquet')$$,
  '23514',
  null,
  'an api_resource row naming a Parquet object is still refused'
);

select has_index(
  'public',
  'data_catalog_listings',
  'data_catalog_listings__pipeline_drive_last_update',
  array['pipeline_name', 'api_base_url', 'date_of_last_update'],
  'the high-water mark query has an index on pipeline, drive, and last update'
);

select throws_ok(
  $$insert into public.data_catalog_listings
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
-- The write-back cache columns. Written atomically: either all three are set,
-- or none are. Only an `api_resource` listing may carry cache state at all.
-- ---------------------------------------------------------------------------

select lives_ok(
  $$insert into public.data_catalog_listings
      (id, display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format)
    values
      ('aaaaaaaa-0000-4000-8000-000000000101', 'pgtap-fixture no cache yet',
       'OCHA', 'api_resource', 'ckan', 'https://pgtap-fixture.invalid',
       'pgtap-fixture-dataset-c', 'pgtap-fixture-resource-c', 'CSV')$$,
  'an api_resource row with no cache columns set inserts'
);

select lives_ok(
  $$insert into public.data_catalog_listings
      (id, display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format,
       cached_object_path, cached_source_version, cached_at)
    values
      ('aaaaaaaa-0000-4000-8000-000000000102', 'pgtap-fixture cached',
       'OCHA', 'api_resource', 'ckan', 'https://pgtap-fixture.invalid',
       'pgtap-fixture-dataset-d', 'pgtap-fixture-resource-d', 'CSV',
       'aaaaaaaa-0000-4000-8000-000000000102.csv', 'ckan:hash:abc', now())$$,
  'an api_resource row with every cache column set inserts'
);

select throws_ok(
  $$insert into public.data_catalog_listings
      (id, display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format,
       cached_object_path)
    values
      ('aaaaaaaa-0000-4000-8000-000000000103', 'pgtap-fixture partial cache',
       'OCHA', 'api_resource', 'ckan', 'https://pgtap-fixture.invalid',
       'pgtap-fixture-dataset-e', 'pgtap-fixture-resource-e', 'CSV',
       'aaaaaaaa-0000-4000-8000-000000000103.csv')$$,
  '23514',
  null,
  'an api_resource row with only cached_object_path set is rejected'
);

select throws_ok(
  $$insert into public.data_catalog_listings
      (id, display_name, external_organization_name, access_kind,
       parquet_file_name, pipeline_name, pipeline_run_id,
       cached_object_path, cached_source_version, cached_at)
    values
      ('aaaaaaaa-0000-4000-8000-000000000104', 'pgtap-fixture pipeline row',
       'World Bank', 'pipeline_parquet',
       'pgtap-fixture-other2.parquet', 'pgtap-fixture-pipeline', 'run-4',
       'should-not-be-allowed.csv', 'pgtap-fixture-version', now())$$,
  '23514',
  null,
  'a pipeline_parquet row with a complete cache set is still rejected'
);

-- ---------------------------------------------------------------------------
-- data_catalog_listings__api_resource_unique must be a plain index, not
-- a partial one. PostgREST's `.upsert(rows, {onConflict: "..."})` can only
-- generate a bare column-list `ON CONFLICT`, and Postgres refuses to infer a
-- partial index as that clause's arbiter. This is the exact conflict target
-- the drive-index pipeline's upsert uses.
-- ---------------------------------------------------------------------------

select lives_ok(
  $$insert into public.data_catalog_listings
      (id, display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format)
    values
      ('aaaaaaaa-0000-4000-8000-000000000105', 'pgtap-fixture upsert test',
       'OCHA', 'api_resource', 'ckan', 'https://pgtap-fixture.invalid',
       'pgtap-fixture-dataset-f', 'pgtap-fixture-resource-f', 'CSV')
    on conflict (api_service, api_base_url, external_dataset_id, api_resource_id)
    do update set display_name = excluded.display_name$$,
  'a bare column-list ON CONFLICT against the api_resource unique index succeeds (regression test for the partial-index bug)'
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
    from public.data_catalog_listings
    where api_base_url = 'https://pgtap-fixture.invalid'
      and api_resource_id = 'pgtap-fixture-resource-a'
  ),
  'Operational Presence',
  'authenticated reads an API catalog listing'
);

select throws_ok(
  $$insert into public.data_catalog_listings
      (display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format)
    values ('Smuggled', 'Nobody', 'api_resource', 'ckan',
            'https://pgtap-fixture.invalid', 'smuggled', 'smuggled-resource', 'CSV')$$,
  '42501',
  null,
  'authenticated cannot insert a catalog listing'
);

reset role;

select * from finish();

rollback;
