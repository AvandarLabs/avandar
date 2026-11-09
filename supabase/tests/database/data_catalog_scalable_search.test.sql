\set ON_ERROR_STOP on

-- How catalog search stays fast as the catalog grows: matches are filtered,
-- sorted, and paged in one place; totals and facet counts stop counting past
-- a cap; and with nothing narrowed, totals and counts come from
-- `data_catalog_facet_counts`, which `data_catalog_facet_counts__refresh`
-- recounts.
--
-- Fixtures: three listings named with a made-up word ("vexmoor"), two from
-- "Vexmoor North" and one from "Vexmoor South", updated 5, 50, and 500 days
-- ago. The newest cannot be loaded. Each carries the keyword "vexmoor-tag",
-- and the North ones also carry "vexmoor-north-tag".

begin;

set search_path to extensions, public;

insert into public.data_catalog_listings
  (id, display_name, organization1_name, access_kind,
   parquet_file_name, pipeline_name, pipeline_run_id,
   date_of_last_update, is_workspace_loadable, tags)
values
  ('e9009001-0000-4000-8000-000000000001'::uuid,
   'Vexmoor alpha', 'Vexmoor North', 'pipeline_parquet',
   'vexmoor-1.parquet', 'pgtap-fixture-scalable', 'run-1',
   now() - interval '5 days', false,
   array['vexmoor-tag', 'vexmoor-north-tag']),
  ('e9009001-0000-4000-8000-000000000002'::uuid,
   'Vexmoor bravo', 'Vexmoor North', 'pipeline_parquet',
   'vexmoor-2.parquet', 'pgtap-fixture-scalable', 'run-1',
   now() - interval '50 days', true,
   array['vexmoor-tag', 'vexmoor-north-tag']),
  ('e9009001-0000-4000-8000-000000000003'::uuid,
   'Vexmoor charlie', 'Vexmoor South', 'pipeline_parquet',
   'vexmoor-3.parquet', 'pgtap-fixture-scalable', 'run-1',
   now() - interval '500 days', true,
   array['vexmoor-tag']);

select public.data_catalog_facet_counts__refresh();

select plan(17);

-- Matching, sorting, and paging

select results_eq(
  $$select display_name
    from public.data_catalog_listings__search_matches(
      'vexmoor', '{}', '{}', 'any', false, '{}', '{}', '{}', 'updated', 2)$$,
  $$values ('Vexmoor alpha'::text), ('Vexmoor bravo')$$,
  'matches sort most recently updated first and stop at the limit'
);

select results_eq(
  $$select display_name
    from public.data_catalog_listings__search_matches(
      'vexmoor', '{}', '{}', 'any', true, '{}', '{}', '{}', 'name', 1, 1)$$,
  $$values ('Vexmoor charlie'::text)$$,
  'matches skip the offset, after dropping what the filters drop'
);

select results_eq(
  $$select display_name
    from public.data_catalog_listings__search_matches(
      'vexmoor', '{}', '{}', 'past_year', false, '{}', '{}', '{}', 'name')$$,
  $$values ('Vexmoor alpha'::text), ('Vexmoor bravo')$$,
  'the update filter keeps only listings inside its window'
);

select throws_ok(
  $$select * from public.data_catalog_listings__search_matches(
      'vexmoor', '{}', '{}', 'any', false, '{}', '{}', '{}', 'newest')$$,
  '22023',
  null,
  'an unknown sort is refused rather than ignored'
);

-- The list's total

select results_eq(
  $$select distinct total_count, is_total_capped
    from public.rpc_data_catalog_listings__search(
      p_query => 'vexmoor', p_count_cap => 2)$$,
  $$values (2::bigint, true)$$,
  'past the cap, the total stops at the cap and says so'
);

select results_eq(
  $$select distinct total_count, is_total_capped
    from public.rpc_data_catalog_listings__search(p_query => 'vexmoor')$$,
  $$values (3::bigint, false)$$,
  'under the cap, the total is exact'
);

select results_eq(
  $$select distinct total_count, is_total_capped
    from public.rpc_data_catalog_listings__search(
      p_query => '', p_is_loadable_only => true, p_count_cap => 1)$$,
  $$select count(*), false
    from public.data_catalog_listings
    where is_workspace_loadable and not is_invalid$$,
  'with nothing narrowed, the total is the catalog''s, however many match'
);

-- The summary table

select results_eq(
  $$select is_loadable_only, listing_count
    from public.data_catalog_facet_counts
    where facet = 'source' and value = 'Vexmoor North'
    order by is_loadable_only$$,
  $$values (false, 2::bigint), (true, 1::bigint)$$,
  'the summary counts each value with and without unloadable listings'
);

select results_eq(
  $$select listing_count
    from public.data_catalog_facet_counts
    where facet = 'unloadable'$$,
  $$select count(*)
    from public.data_catalog_listings
    where not is_workspace_loadable or is_invalid$$,
  'the summary counts the listings that cannot be loaded'
);

select results_eq(
  $$select value, listing_count
    from public.data_catalog_facet_counts
    where facet = 'updated_within' and not is_loadable_only
    order by value$$,
  $$select update_window.name, count(listing.id)
    from unnest(array['any', 'over_a_year', 'past_month', 'past_year'])
      as update_window (name)
      left join public.data_catalog_listings listing
        on public.data_catalog_listings__is_updated_within(
          coalesce(listing.date_of_last_update, listing.date_of_last_sync),
          update_window.name)
    group by update_window.name
    order by update_window.name$$,
  'the summary counts each update window as the window check does'
);

-- Facet counts

insert into public.data_catalog_listings
  (id, display_name, organization1_name, access_kind,
   parquet_file_name, pipeline_name, pipeline_run_id, tags)
values
  ('e9009001-0000-4000-8000-000000000004'::uuid,
   'Vexmoor delta', 'Vexmoor North', 'pipeline_parquet',
   'vexmoor-4.parquet', 'pgtap-fixture-scalable', 'run-1',
   array['vexmoor-tag']);

select results_eq(
  $$select listing_count
    from public.data_catalog_listings__search_facet_rows(p_query => '')
    where facet = 'source' and value = 'Vexmoor North'$$,
  $$values (2::bigint)$$,
  'with nothing narrowed, counts are the summary''s, as of its last refresh'
);

select results_eq(
  $$select listing_count
    from public.data_catalog_listings__search_facet_rows(p_query => 'vexmoor')
    where facet = 'source' and value = 'Vexmoor North'$$,
  $$values (3::bigint)$$,
  'a search counts its own matches, exactly and as they are now'
);

select results_eq(
  $$select count(*), count(listing_count)
    from public.data_catalog_listings__search_facet_rows(
      p_query => 'vexmoor', p_count_cap => 2)
    where facet = 'source' and value in ('Vexmoor North', 'Vexmoor South')$$,
  $$values (2::bigint, 0::bigint)$$,
  'past the cap, the options are the catalog''s values with no counts'
);

select results_eq(
  $$select listing_count
    from public.data_catalog_listings__search_facet_rows(
      p_query => 'vexmoor', p_count_cap => 2, p_sources => array['Vexmoor West'])
    where facet = 'source' and value = 'Vexmoor West'$$,
  $$values (null::bigint)$$,
  'past the cap, a chosen value is still listed, with no count'
);

select results_eq(
  $$select listing_count
    from public.data_catalog_listings__search_facet_rows(
      p_query => 'vexmoor', p_count_cap => 2)
    where facet = 'updated_within' and value = 'any'$$,
  $$values (null::bigint)$$,
  'past the cap, the update windows carry no counts'
);

-- Keyword search

select results_eq(
  $$select value, listing_count
    from public.rpc_data_catalog_listings__search_tag_options(
      p_tag_search => 'vexmoor north', p_query => '')$$,
  $$values ('vexmoor-north-tag'::text, 2::bigint)$$,
  'with nothing narrowed, keyword search reads the summary''s keywords'
);

select results_eq(
  $$select value, listing_count
    from public.rpc_data_catalog_listings__search_tag_options(
      p_tag_search => 'vexmoor', p_query => 'vexmoor',
      p_sources => array['Vexmoor North'])$$,
  $$values ('vexmoor-tag'::text, 3::bigint), ('vexmoor-north-tag', 2)$$,
  'a narrowed keyword search counts its own matches'
);

select * from finish();

rollback;
