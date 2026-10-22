\set ON_ERROR_STOP on

-- Fixtures: one unverified `api_resource` listing with three relation
-- columns: a Socrata-style labelled one, one of unknown original type, and
-- one the source does not really have. Identifiers are
-- `pgtap-fixture`-prefixed and hosts are `.invalid`.

begin;

set search_path to extensions, public;

insert into public.data_catalog_listings
  (id, display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format,
   pipeline_name, pipeline_run_id)
values
  ('e9004001-0000-4000-8000-000000000001'::uuid, 'unverified', 'Fixture Org',
   'api_resource', 'socrata', 'https://pgtap-fixture-a.invalid',
   'pgtap-fixture-unverified', 'r1', 'CSV', 'pgtap-fixture-pipeline', 'run-1');

insert into public.data_catalog_listings__relation_columns
  (catalog_listing_id, column_name, display_order, original_data_type,
   cast_data_type)
values
  ('e9004001-0000-4000-8000-000000000001'::uuid, 'amount', 0, 'Number', 'VARCHAR'),
  ('e9004001-0000-4000-8000-000000000001'::uuid, 'region', 1, 'unknown', 'VARCHAR'),
  ('e9004001-0000-4000-8000-000000000001'::uuid, 'location_address', 2, 'Text', 'VARCHAR');

select plan(8);

select throws_ok(
  $$select public.rpc_data_catalog_listings__write_verified_column_types(
      'e9004001-0000-4000-8000-000000000001'::uuid, '[]'::jsonb)$$,
  'P0001',
  'rpc_data_catalog_listings__write_verified_column_types needs a listing id and a non-empty JSON array of columns',
  'an empty column list is refused'
);

select throws_ok(
  $$select public.rpc_data_catalog_listings__write_verified_column_types(
      'e9004001-0000-4000-8000-000000000001'::uuid,
      '[{"column_name": "a", "cast_data_type": "VARCHAR"}, {"column_name": "a", "cast_data_type": "BIGINT"}]'::jsonb)$$,
  'P0001',
  'Each column may appear only once',
  'a column named twice is refused'
);

select throws_ok(
  $$select public.rpc_data_catalog_listings__write_verified_column_types(
      'e9004099-0000-4000-8000-000000000099'::uuid,
      '[{"column_name": "a", "cast_data_type": "VARCHAR"}]'::jsonb)$$,
  'P0001',
  'Catalog listing e9004099-0000-4000-8000-000000000099 does not exist',
  'a missing listing is refused'
);

select is(
  (
    select date_column_type_last_verified
    from public.rpc_data_catalog_listings__write_verified_column_types(
      'e9004001-0000-4000-8000-000000000001'::uuid,
      '[{"column_name": "region", "cast_data_type": "VARCHAR"},
        {"column_name": "amount", "cast_data_type": "DOUBLE"},
        {"column_name": "year", "cast_data_type": "BIGINT"}]'::jsonb)
  ),
  now(),
  'the listing is marked verified now'
);

select results_eq(
  $$select column_name, display_order, original_data_type, cast_data_type::text
    from public.data_catalog_listings__relation_columns
    where catalog_listing_id = 'e9004001-0000-4000-8000-000000000001'::uuid
    order by display_order$$,
  $$values
    ('region', 0, 'VARCHAR', 'VARCHAR'),
    ('amount', 1, 'Number', 'DOUBLE'),
    ('year', 2, 'BIGINT', 'BIGINT')$$,
  'the columns are replaced in the given order, keeping known original types, deleting the missing one, and adding the new one'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.rpc_data_catalog_listings__write_verified_column_types(uuid, jsonb)',
    'execute'
  ),
  'a signed-in user may not write verified column types directly'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_data_catalog_listings__write_verified_column_types(uuid, jsonb)',
    'execute'
  ),
  'an anonymous visitor may not write verified column types'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.rpc_data_catalog_listings__write_verified_column_types(uuid, jsonb)',
    'execute'
  ),
  'the service role may write verified column types'
);

select * from finish();

rollback;
