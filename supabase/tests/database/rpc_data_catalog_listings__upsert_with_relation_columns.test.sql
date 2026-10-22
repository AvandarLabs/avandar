\set ON_ERROR_STOP on

-- Fixtures: one stored `api_resource` listing with two relation columns and a
-- cache written by the app, which an upsert must keep. Identifiers are
-- `pgtap-fixture`-prefixed and hosts are `.invalid`.

begin;

set search_path to extensions, public;

insert into public.data_catalog_listings
  (id, display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format,
   pipeline_name, pipeline_run_id, pipeline_scope_keys, cached_object_path,
   cached_source_version, cached_at)
values
  ('e8004001-0000-4000-8000-000000000001'::uuid, 'stored', 'Fixture Org',
   'api_resource', 'ckan', 'https://pgtap-fixture-a.invalid',
   'pgtap-fixture-stored', 'r1', 'CSV', 'pgtap-fixture-pipeline', 'run-1',
   array['all'], 'cache/stored.parquet', 'v1', '2026-10-01T00:00:00Z');

insert into public.data_catalog_listings__relation_columns
  (catalog_listing_id, column_name, display_order, original_data_type,
   cast_data_type)
values
  ('e8004001-0000-4000-8000-000000000001'::uuid, 'old_a', 0, 'Text', 'VARCHAR'),
  ('e8004001-0000-4000-8000-000000000001'::uuid, 'old_b', 1, 'Text', 'VARCHAR');

-- Builds one `p_listings` element for an `api_resource` listing of the
-- fixture pipeline.
create function pg_temp.api_listing (
  p_dataset_id text,
  p_display_name text,
  p_columns jsonb
) returns jsonb as $$
  select jsonb_build_object(
    'listing', jsonb_build_object(
      'access_kind', 'api_resource',
      'pipeline_name', 'pgtap-fixture-pipeline',
      'pipeline_run_id', 'run-2',
      'display_name', p_display_name,
      'external_organization_name', 'Fixture Org',
      'external_dataset_id', p_dataset_id,
      'date_of_last_sync', '2026-10-22T00:00:00Z',
      'api_service', 'ckan',
      'api_base_url', 'https://pgtap-fixture-a.invalid',
      'api_resource_id', 'r1',
      'api_resource_format', 'CSV',
      'pipeline_scope_keys', jsonb_build_array('all')
    ),
    'relation_columns', p_columns
  );
$$ language sql;

create function pg_temp.one_column (p_name text) returns jsonb as $$
  select jsonb_build_array(jsonb_build_object(
    'column_name', p_name,
    'display_order', 0,
    'original_data_type', 'Number',
    'cast_data_type', 'DOUBLE'
  ));
$$ language sql;

select plan(14);

-- ---------------------------------------------------------------------------
-- Refusing a listing without columns, and rolling back the whole call
-- ---------------------------------------------------------------------------

select throws_ok(
  $$select * from public.rpc_data_catalog_listings__upsert_with_relation_columns(
      jsonb_build_array(
        pg_temp.api_listing('pgtap-fixture-first', 'first', pg_temp.one_column('a')),
        pg_temp.api_listing('pgtap-fixture-bare', 'bare', '[]'::jsonb)
      ))$$,
  'P0001',
  'Listing "bare" has no relation columns. A listing is never stored without its columns.',
  'a listing with no relation columns is refused'
);

select is(
  (
    select count(*)::integer
    from public.data_catalog_listings
    where external_dataset_id in ('pgtap-fixture-first', 'pgtap-fixture-bare')
  ),
  0,
  'a refused call stores none of its listings, not even the ones before the refused one'
);

select throws_ok(
  $$select * from public.rpc_data_catalog_listings__upsert_with_relation_columns(
      jsonb_build_array(
        jsonb_build_object('listing', pg_temp.api_listing('pgtap-fixture-no-key', 'no key', '[]'::jsonb) -> 'listing')
      ))$$,
  'P0001',
  'Listing "no key" has no relation columns. A listing is never stored without its columns.',
  'a listing with no relation_columns key is refused'
);

select throws_ok(
  $$select * from public.rpc_data_catalog_listings__upsert_with_relation_columns(
      jsonb_build_array(
        pg_temp.api_listing('pgtap-fixture-twice', 'twice', pg_temp.one_column('a')),
        pg_temp.api_listing('pgtap-fixture-twice', 'twice', pg_temp.one_column('b'))
      ))$$,
  'P0001',
  'Listing "twice" appears twice in one call. Each listing may be written only once per call.',
  'a call holding one listing twice is refused'
);

select throws_ok(
  $$select * from public.rpc_data_catalog_listings__upsert_with_relation_columns('{}'::jsonb)$$,
  'P0001',
  'rpc_data_catalog_listings__upsert_with_relation_columns needs a JSON array of listings',
  'a non-array argument is refused'
);

-- ---------------------------------------------------------------------------
-- Inserting a new listing with its columns
-- ---------------------------------------------------------------------------

select is(
  (
    select display_name
    from public.rpc_data_catalog_listings__upsert_with_relation_columns(
      jsonb_build_array(
        pg_temp.api_listing('pgtap-fixture-new', 'new', jsonb_build_array(
          jsonb_build_object('column_name', 'x', 'display_order', 0,
            'original_data_type', 'Text', 'cast_data_type', 'VARCHAR'),
          jsonb_build_object('column_name', 'y', 'display_order', 1,
            'original_data_type', 'Number', 'cast_data_type', 'DOUBLE')
        ))
      ))
  ),
  'new',
  'a new listing is returned as stored'
);

select results_eq(
  $$select relation_column.column_name, relation_column.display_order,
      relation_column.original_data_type, relation_column.cast_data_type::text
    from public.data_catalog_listings__relation_columns relation_column
    join public.data_catalog_listings listing
      on listing.id = relation_column.catalog_listing_id
    where listing.external_dataset_id = 'pgtap-fixture-new'
    order by relation_column.display_order$$,
  $$values ('x', 0, 'Text', 'VARCHAR'), ('y', 1, 'Number', 'DOUBLE')$$,
  'a new listing is stored with every one of its columns'
);

-- ---------------------------------------------------------------------------
-- Replacing a stored listing and its columns
-- ---------------------------------------------------------------------------

select is(
  (
    select id
    from public.rpc_data_catalog_listings__upsert_with_relation_columns(
      jsonb_build_array(
        pg_temp.api_listing('pgtap-fixture-stored', 'stored, renamed', pg_temp.one_column('new_a'))
      ))
  ),
  'e8004001-0000-4000-8000-000000000001'::uuid,
  'a stored listing keeps its id'
);

select results_eq(
  $$select display_name, pipeline_run_id
    from public.data_catalog_listings
    where id = 'e8004001-0000-4000-8000-000000000001'::uuid$$,
  $$values ('stored, renamed', 'run-2')$$,
  'a stored listing takes the new contract column values'
);

select results_eq(
  $$select cached_object_path, cached_source_version
    from public.data_catalog_listings
    where id = 'e8004001-0000-4000-8000-000000000001'::uuid$$,
  $$values ('cache/stored.parquet', 'v1')$$,
  'a stored listing keeps the cache the app wrote'
);

select results_eq(
  $$select column_name
    from public.data_catalog_listings__relation_columns
    where catalog_listing_id = 'e8004001-0000-4000-8000-000000000001'::uuid$$,
  $$values ('new_a')$$,
  'a stored listing''s columns are replaced as a whole set'
);

-- ---------------------------------------------------------------------------
-- A pipeline_parquet listing
-- ---------------------------------------------------------------------------

select is(
  (
    select parquet_file_name
    from public.rpc_data_catalog_listings__upsert_with_relation_columns(
      jsonb_build_array(jsonb_build_object(
        'listing', jsonb_build_object(
          'access_kind', 'pipeline_parquet',
          'pipeline_name', 'pgtap-fixture-pipeline',
          'pipeline_run_id', 'run-2',
          'display_name', 'parquet',
          'external_organization_name', 'Fixture Org',
          'parquet_file_name', 'pgtap-fixture.parquet'
        ),
        'relation_columns', pg_temp.one_column('p')
      )))
  ),
  'pgtap-fixture.parquet',
  'a pipeline_parquet listing is upserted on its own conflict key'
);

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

select ok(
  not has_function_privilege(
    'authenticated',
    'public.rpc_data_catalog_listings__upsert_with_relation_columns(jsonb)',
    'execute'
  ),
  'a signed-in user may not write catalog listings'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_data_catalog_listings__upsert_with_relation_columns(jsonb)',
    'execute'
  ),
  'an anonymous visitor may not write catalog listings'
);

select * from finish();

rollback;
