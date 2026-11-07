\set ON_ERROR_STOP on

-- Fixtures: two drives and three `pipeline_parquet` listings with
-- organization levels, domains, and tags. Names and tags carry made-up words
-- ("flurbix", "glimmerwort") and organizations are "Fixture"-prefixed, so no
-- seeded listing can match them.

begin;

set search_path to extensions, public;

insert into public.data_catalog_drives (id, pipeline_name, drive_key, organization2_label)
values
  ('e9007001-0000-4000-8000-000000000001'::uuid, 'pgtap-fixture-search',
   'https://pgtap-fixture-a.invalid', 'Agency'),
  ('e9007001-0000-4000-8000-000000000002'::uuid, 'pgtap-fixture-search',
   'https://pgtap-fixture-b.invalid', 'Department');

insert into public.data_catalog_listings
  (id, display_name, organization1_name, organization2_name, domains, tags,
   drive_id, parquet_file_name, pipeline_name, pipeline_run_id)
values
  ('e9006001-0000-4000-8000-000000000011'::uuid, 'Flurbix taxi trips',
   'Fixture City', 'Fixture Taxi Commission', array['Transportation'],
   array['glimmerwort', 'taxi'], 'e9007001-0000-4000-8000-000000000001'::uuid,
   'search-11.parquet', 'pgtap-fixture-search', 'run-1'),
  ('e9006001-0000-4000-8000-000000000012'::uuid, 'Flurbix ferry riders',
   'Fixture City', 'Fixture Transit Office', array['Transportation'],
   array['ferry'], 'e9007001-0000-4000-8000-000000000001'::uuid,
   'search-12.parquet', 'pgtap-fixture-search', 'run-1'),
  ('e9006001-0000-4000-8000-000000000013'::uuid, 'Flurbix clinic visits',
   'Fixture State', 'Fixture Health Department', array['Health'],
   array['glimmerwort', 'clinics'], 'e9007001-0000-4000-8000-000000000002'::uuid,
   'search-13.parquet', 'pgtap-fixture-search', 'run-1');

select plan(8);

select results_eq(
  $$select value, listing_count
    from public.rpc_data_catalog_listings__search_facets('flurbix')
    where facet = 'organization1'
    order by listing_count desc, value$$,
  $$values ('Fixture City'::text, 2::bigint), ('Fixture State'::text, 1::bigint)$$,
  'publishers are counted for the query'
);

select results_eq(
  $$select value, listing_count
    from public.rpc_data_catalog_listings__search_facets('flurbix', array['Fixture City'])
    where facet = 'organization1'
    order by listing_count desc, value$$,
  $$values ('Fixture City'::text, 2::bigint), ('Fixture State'::text, 1::bigint)$$,
  'the publisher facet ignores its own filter'
);

select results_eq(
  $$select value, listing_count
    from public.rpc_data_catalog_listings__search_facets('flurbix', array['Fixture City'])
    where facet = 'organization2'
    order by value$$,
  $$values ('Fixture Taxi Commission'::text, 1::bigint), ('Fixture Transit Office'::text, 1::bigint)$$,
  'the second-level facet narrows to the chosen publisher'
);

select results_eq(
  $$select value, listing_count
    from public.rpc_data_catalog_listings__search_facets('flurbix', array['Fixture City'])
    where facet = 'organization2_label'$$,
  $$values ('Agency'::text, 2::bigint)$$,
  'the second-level label comes from the chosen publisher''s drives'
);

select results_eq(
  $$select value, listing_count
    from public.rpc_data_catalog_listings__search_facets(
      'flurbix', null, null, null, array['clinics'])
    where facet = 'domain'$$,
  $$values ('Health'::text, 1::bigint)$$,
  'the domain facet follows the keyword filter'
);

select is(
  (select sum(listing_count)
    from public.rpc_data_catalog_listings__search_facets('flurbix', null, null, array['Transportation'])
    where facet = 'organization1'),
  (select max(total_count)::numeric
    from public.rpc_data_catalog_listings__search('flurbix', 50, 0, null, null, array['Transportation'])),
  'facets and search agree on what matches'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.rpc_data_catalog_listings__search_facets(text, text[], text[], text[], text[])',
    'execute'
  ),
  'a signed-in user may read facets'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_data_catalog_listings__search_facets(text, text[], text[], text[], text[])',
    'execute'
  ),
  'a signed-out visitor may not read facets'
);

select * from finish();

rollback;
