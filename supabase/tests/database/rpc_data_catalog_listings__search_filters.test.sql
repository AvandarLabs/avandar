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

select bag_eq(
  $$select id from public.rpc_data_catalog_listings__search('glimmerwort', 50, 0)$$,
  $$values
    ('e9006001-0000-4000-8000-000000000011'::uuid),
    ('e9006001-0000-4000-8000-000000000013'::uuid)$$,
  'a tag makes a listing searchable'
);

select bag_eq(
  $$select id from public.rpc_data_catalog_listings__search('flurbix transportation', 50, 0)$$,
  $$values
    ('e9006001-0000-4000-8000-000000000011'::uuid),
    ('e9006001-0000-4000-8000-000000000012'::uuid)$$,
  'a domain makes a listing searchable'
);

select results_eq(
  $$select id from public.rpc_data_catalog_listings__search('flurbix "taxi commission"', 50, 0)$$,
  $$values ('e9006001-0000-4000-8000-000000000011'::uuid)$$,
  'a level-2 organization makes a listing searchable'
);

select bag_eq(
  $$select id from public.rpc_data_catalog_listings__search('', 50, 0, array['Fixture City'])$$,
  $$values
    ('e9006001-0000-4000-8000-000000000011'::uuid),
    ('e9006001-0000-4000-8000-000000000012'::uuid)$$,
  'a publisher filter applies to a blank query'
);

select is_empty(
  $$select id from public.rpc_data_catalog_listings__search(
    'flurbix', 50, 0, array['Fixture City'], null, array['Health'])$$,
  'filters AND together'
);

select bag_eq(
  $$select id from public.rpc_data_catalog_listings__search(
    'flurbix', 50, 0, null, null, null, array['ferry', 'clinics'])$$,
  $$values
    ('e9006001-0000-4000-8000-000000000012'::uuid),
    ('e9006001-0000-4000-8000-000000000013'::uuid)$$,
  'values within one filter OR together'
);

select is(
  (select count(*) from public.rpc_data_catalog_listings__search(
    'flurbix', 50, 0, '{}'::text[], '{}'::text[], '{}'::text[], '{}'::text[])),
  3::bigint,
  'an empty filter is no filter'
);

select results_eq(
  $$select organization2_name from public.rpc_data_catalog_listings__search(
    '', 50, 0, array['Fixture State'])$$,
  $$values ('Fixture Health Department'::text)$$,
  'a row carries its organization levels'
);

select * from finish();

rollback;
