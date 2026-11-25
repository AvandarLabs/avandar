\set ON_ERROR_STOP on

-- Fixtures: four `pipeline_parquet` listings. Names carry made-up words
-- ("zorbleton", "quoxmire") so no seeded listing can match them.

begin;

set search_path to extensions, public;

insert into public.data_catalog_listings
  (id, display_name, organization1_name, description,
   parquet_file_name, pipeline_name, pipeline_run_id)
values
  ('e9006001-0000-4000-8000-000000000001'::uuid,
   'Zorbleton measles vaccination coverage', 'Fixture Health Department',
   null, 'search-1.parquet', 'pgtap-fixture-search', 'run-1'),
  ('e9006001-0000-4000-8000-000000000002'::uuid,
   'Zorbleton school enrollment', 'Fixture Education Office',
   'Counts by grade', 'search-2.parquet', 'pgtap-fixture-search', 'run-1'),
  ('e9006001-0000-4000-8000-000000000003'::uuid,
   'Weekly case counts', 'Fixture Health Department',
   'Includes zorbleton measles reports', 'search-3.parquet',
   'pgtap-fixture-search', 'run-1'),
  ('e9006001-0000-4000-8000-000000000004'::uuid,
   'Bridge inspections', 'Fixture Quoxmire Agency',
   null, 'search-4.parquet', 'pgtap-fixture-search', 'run-1');

-- An unsearched, unfiltered total is the summary's, as of its last refresh.
select public.data_catalog_facet_counts__refresh();

select plan(15);

select bag_eq(
  $$select id from public.rpc_data_catalog_listings__search('zorbleton', 50, 0)$$,
  $$values
    ('e9006001-0000-4000-8000-000000000001'::uuid),
    ('e9006001-0000-4000-8000-000000000002'::uuid),
    ('e9006001-0000-4000-8000-000000000003'::uuid)$$,
  'a word matches listings with it in their name or description'
);

select is(
  (select id
    from public.rpc_data_catalog_listings__search('zorbleton', 50, 0)
    offset 2 limit 1),
  'e9006001-0000-4000-8000-000000000003'::uuid,
  'a description-only match ranks below every name match'
);

select results_eq(
  $$select id from public.rpc_data_catalog_listings__search('quoxmire', 50, 0)$$,
  $$values ('e9006001-0000-4000-8000-000000000004'::uuid)$$,
  'a word in the organization name matches'
);

select bag_eq(
  $$select id from public.rpc_data_catalog_listings__search('zorble', 50, 0)$$,
  $$values
    ('e9006001-0000-4000-8000-000000000001'::uuid),
    ('e9006001-0000-4000-8000-000000000002'::uuid)$$,
  'a partial word matches the names that start with it'
);

select bag_eq(
  $$select id from public.rpc_data_catalog_listings__search('zorblaton', 50, 0)$$,
  $$values
    ('e9006001-0000-4000-8000-000000000001'::uuid),
    ('e9006001-0000-4000-8000-000000000002'::uuid)$$,
  'a misspelled word matches the names it is close to'
);

select is_empty(
  $$select id from public.rpc_data_catalog_listings__search('xylophonequack', 50, 0)$$,
  'a word no listing contains matches nothing'
);

select is_empty(
  $$select id from public.rpc_data_catalog_listings__search('zorbleton', 2, 0)
    intersect
    select id from public.rpc_data_catalog_listings__search('zorbleton', 2, 2)$$,
  'consecutive pages share no listing'
);

select results_eq(
  $$select distinct total_count
    from public.rpc_data_catalog_listings__search('zorbleton', 1, 1)$$,
  $$values (3::bigint)$$,
  'every row of a page carries the total number of matches'
);

select results_eq(
  $$select count(*) from public.rpc_data_catalog_listings__search('zorbleton', 0, 0)$$,
  $$values (1::bigint)$$,
  'a page size below one returns one row'
);

select results_eq(
  $$select distinct total_count
    from public.rpc_data_catalog_listings__search('   ', 1, 0)$$,
  $$select count(*) from public.data_catalog_listings$$,
  'a blank query matches every listing'
);

insert into public.data_catalog_listings
  (id, display_name, organization1_name, description,
   parquet_file_name, pipeline_name, pipeline_run_id)
select
  ('e9006001-0000-4000-8000-0000000001' || lpad(listing_num::text, 2, '0'))::uuid,
  'Plain report ' || listing_num,
  'Fixture Health Department',
  'zorbleton notes',
  'search-bulk-' || listing_num || '.parquet',
  'pgtap-fixture-search',
  'run-1'
from
  generate_series(1, 47) as listing_num;

insert into public.data_catalog_listings
  (id, display_name, organization1_name, description,
   parquet_file_name, pipeline_name, pipeline_run_id)
values
  ('e9006001-0000-4000-8000-000000000099'::uuid,
   'zorblaton coverage', 'Fixture Health Department',
   'bridge work', 'search-similar.parquet', 'pgtap-fixture-search', 'run-1');

select is_empty(
  $$select id from public.rpc_data_catalog_listings__search('zorbleton', 200, 0)
    where id = 'e9006001-0000-4000-8000-000000000099'::uuid$$,
  'a word with a page of whole-word matches leaves out a name that only resembles it'
);

select ok(
  exists (
    select
      1
    from
      pg_indexes
    where
      schemaname = 'public' and
      indexname = 'data_catalog_listings__search_vector_loadable' and
      indexdef ilike '%is_workspace_loadable%' and
      indexdef ilike '%is_invalid%'
  ),
  'loadable catalog search has its own search index'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.rpc_data_catalog_listings__search(text, integer, integer, text[], text[], text, boolean, text[], text[], text[], text, integer)',
    'execute'
  ),
  'a signed-in user may search the catalog'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_data_catalog_listings__search(text, integer, integer, text[], text[], text, boolean, text[], text[], text[], text, integer)',
    'execute'
  ),
  'a signed-out visitor may not search the catalog'
);

set local role authenticated;

select results_eq(
  $$select id from public.rpc_data_catalog_listings__search('quoxmire', 50, 0)$$,
  $$values ('e9006001-0000-4000-8000-000000000004'::uuid)$$,
  'a signed-in user sees matches through row level security'
);

select * from finish();

rollback;
