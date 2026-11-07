\set ON_ERROR_STOP on

-- Filters and sort on `rpc_data_catalog_listings__search`, and the facet
-- counts `rpc_data_catalog_listings__search_facets` reports for the same
-- narrowing. Tested together because each facet must count exactly what its
-- filter would keep.
--
-- Fixtures: four listings named with a made-up word ("plimbrook") so every
-- query below matches only them, from two sources, in three formats, updated
-- 5, 10, 100, and 400 days ago. The 400-day one reports no update date of its
-- own, so it is dated by its last sync. The 5-day one cannot be loaded.

begin;

set search_path to extensions, public;

insert into public.data_catalog_listings
  (id, display_name, organization1_name, access_kind,
   parquet_file_name, pipeline_name, pipeline_run_id,
   api_service, api_base_url, api_resource_id, api_resource_format,
   external_dataset_id, date_of_last_update, date_of_last_sync,
   is_invalid, invalid_dataset_reason)
values
  ('e9007001-0000-4000-8000-000000000001'::uuid,
   'Plimbrook measles cases', 'Fixture North Agency', 'pipeline_parquet',
   'plimbrook-1.parquet', 'pgtap-fixture-filters', 'run-1',
   null, null, null, null,
   null, now() - interval '10 days', null,
   false, null),
  ('e9007001-0000-4000-8000-000000000002'::uuid,
   'Plimbrook school census', 'Fixture North Agency', 'api_resource',
   null, null, null,
   'socrata', 'https://plimbrook.example.org', 'pl-0002', 'csv',
   'pl-0002', now() - interval '100 days', null,
   false, null),
  ('e9007001-0000-4000-8000-000000000003'::uuid,
   'Plimbrook road works', 'Fixture South Agency', 'api_resource',
   null, null, null,
   'socrata', 'https://plimbrook.example.org', 'pl-0003', 'json',
   'pl-0003', null, now() - interval '400 days',
   false, null),
  ('e9007001-0000-4000-8000-000000000004'::uuid,
   'Plimbrook broken feed', 'Fixture South Agency', 'pipeline_parquet',
   'plimbrook-4.parquet', 'pgtap-fixture-filters', 'run-1',
   null, null, null, null,
   null, now() - interval '5 days', null,
   true, 'empty_dataset');

select plan(22);

-- Search filters

select results_eq(
  $$select id from public.rpc_data_catalog_listings__search(
    p_query => 'plimbrook', p_formats => array['CSV'])$$,
  $$values ('e9007001-0000-4000-8000-000000000002'::uuid)$$,
  'a format keeps only listings read in that format'
);

select bag_eq(
  $$select id from public.rpc_data_catalog_listings__search(
    p_query => 'plimbrook', p_sources => array['Fixture North Agency'])$$,
  $$values
    ('e9007001-0000-4000-8000-000000000001'::uuid),
    ('e9007001-0000-4000-8000-000000000002'::uuid)$$,
  'a source keeps only its own listings'
);

select bag_eq(
  $$select id from public.rpc_data_catalog_listings__search(
    p_query => 'plimbrook', p_updated_within => 'past_month')$$,
  $$values
    ('e9007001-0000-4000-8000-000000000001'::uuid),
    ('e9007001-0000-4000-8000-000000000004'::uuid)$$,
  'past month keeps listings updated in the last 31 days'
);

select results_eq(
  $$select id from public.rpc_data_catalog_listings__search(
    p_query => 'plimbrook', p_updated_within => 'past_month',
    p_is_loadable_only => true)$$,
  $$values ('e9007001-0000-4000-8000-000000000001'::uuid)$$,
  'loadable only drops a listing that cannot be loaded'
);

select results_eq(
  $$select id from public.rpc_data_catalog_listings__search(
    p_query => 'plimbrook', p_updated_within => 'over_a_year')$$,
  $$values ('e9007001-0000-4000-8000-000000000003'::uuid)$$,
  'a listing with no update date of its own is dated by its last sync'
);

select results_eq(
  $$select distinct total_count from public.rpc_data_catalog_listings__search(
    p_query => 'plimbrook', p_formats => array['PARQUET'], p_limit => 1)$$,
  $$values (2::bigint)$$,
  'the total counts every listing the filters keep, not just the page'
);

-- Search sort and the columns the list shows

select results_eq(
  $$select id from public.rpc_data_catalog_listings__search(
    p_query => 'plimbrook', p_sort_by => 'updated')$$,
  $$values
    ('e9007001-0000-4000-8000-000000000004'::uuid),
    ('e9007001-0000-4000-8000-000000000001'::uuid),
    ('e9007001-0000-4000-8000-000000000002'::uuid),
    ('e9007001-0000-4000-8000-000000000003'::uuid)$$,
  'updated sorts the most recently updated listing first'
);

select results_eq(
  $$select display_name, file_format
    from public.rpc_data_catalog_listings__search(
      p_query => 'plimbrook', p_sort_by => 'name')$$,
  $$values
    ('Plimbrook broken feed'::text, 'PARQUET'::text),
    ('Plimbrook measles cases', 'PARQUET'),
    ('Plimbrook road works', 'JSON'),
    ('Plimbrook school census', 'CSV')$$,
  'name sorts alphabetically, and each row carries its upper-cased format'
);

select results_eq(
  $$select last_updated_at from public.rpc_data_catalog_listings__search(
    p_query => 'plimbrook', p_updated_within => 'over_a_year')$$,
  $$select date_of_last_sync from public.data_catalog_listings
    where id = 'e9007001-0000-4000-8000-000000000003'::uuid$$,
  'each row carries the date it is filtered and sorted by'
);

select throws_ok(
  $$select * from public.rpc_data_catalog_listings__search(
    p_query => 'plimbrook', p_sort_by => 'newest')$$,
  '22023',
  null,
  'an unknown sort is refused rather than ignored'
);

select throws_ok(
  $$select * from public.rpc_data_catalog_listings__search(
    p_query => 'plimbrook', p_updated_within => 'last_week')$$,
  '22023',
  null,
  'an unknown update window is refused rather than ignored'
);

-- Facets with nothing narrowed

select bag_eq(
  $$select value, listing_count
    from public.rpc_data_catalog_listings__search_facets(p_query => 'plimbrook')
    where facet = 'source'$$,
  $$values ('Fixture North Agency'::text, 2::bigint),
           ('Fixture South Agency', 2)$$,
  'the source facet counts each source''s matches'
);

select bag_eq(
  $$select value, listing_count
    from public.rpc_data_catalog_listings__search_facets(p_query => 'plimbrook')
    where facet = 'format'$$,
  $$values ('PARQUET'::text, 2::bigint), ('CSV', 1), ('JSON', 1)$$,
  'the format facet counts each format''s matches'
);

select bag_eq(
  $$select value, listing_count
    from public.rpc_data_catalog_listings__search_facets(p_query => 'plimbrook')
    where facet = 'updated_within'$$,
  $$values ('any'::text, 4::bigint), ('past_month', 2), ('past_year', 3),
           ('over_a_year', 1)$$,
  'the update facet counts each window, and the windows are cumulative'
);

select results_eq(
  $$select listing_count
    from public.rpc_data_catalog_listings__search_facets(p_query => 'plimbrook')
    where facet = 'unloadable'$$,
  $$values (1::bigint)$$,
  'the unloadable count is the listings loadable-only would hide'
);

select results_eq(
  $$select listing_count
    from public.rpc_data_catalog_listings__search_facets(p_query => 'plimbrook')
    where facet = 'catalog'$$,
  $$select count(*) from public.data_catalog_listings$$,
  'the catalog row is the size of the whole catalog, unsearched'
);

-- Facets under narrowing

select bag_eq(
  $$select value, listing_count
    from public.rpc_data_catalog_listings__search_facets(
      p_query => 'plimbrook', p_sources => array['Fixture North Agency'],
      p_is_loadable_only => true)
    where facet = 'source'$$,
  $$values ('Fixture North Agency'::text, 2::bigint),
           ('Fixture South Agency', 1)$$,
  'a facet ignores its own filter, so other sources still count'
);

select bag_eq(
  $$select value, listing_count
    from public.rpc_data_catalog_listings__search_facets(
      p_query => 'plimbrook', p_sources => array['Fixture North Agency'],
      p_is_loadable_only => true)
    where facet = 'format'$$,
  $$values ('PARQUET'::text, 1::bigint), ('CSV', 1)$$,
  'a facet applies every other filter'
);

select results_eq(
  $$select listing_count
    from public.rpc_data_catalog_listings__search_facets(
      p_query => 'plimbrook', p_sources => array['Fixture East Agency'])
    where facet = 'source' and value = 'Fixture East Agency'$$,
  $$values (0::bigint)$$,
  'a chosen value with no matches is still listed, so it can be unchosen'
);

-- Privileges

select ok(
  has_function_privilege(
    'authenticated',
    'public.rpc_data_catalog_listings__search_facets(text, text[], text[], text, boolean)',
    'execute'
  ),
  'a signed-in user may count the catalog''s facets'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_data_catalog_listings__search_facets(text, text[], text[], text, boolean)',
    'execute'
  ),
  'a signed-out visitor may not count the catalog''s facets'
);

set local role authenticated;

select bag_eq(
  $$select id from public.rpc_data_catalog_listings__search(
    p_query => 'plimbrook', p_sources => array['Fixture South Agency'])$$,
  $$values
    ('e9007001-0000-4000-8000-000000000003'::uuid),
    ('e9007001-0000-4000-8000-000000000004'::uuid)$$,
  'a signed-in user filters through row level security'
);

select * from finish();

rollback;
