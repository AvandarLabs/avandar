\set ON_ERROR_STOP on

-- Keywords are the one facet with thousands of values, so the facet rows
-- return only the 50 keywords with the most listings, and
-- `rpc_data_catalog_listings__search_tag_options` finds the rest by what a
-- user types into the Keywords filter.
--
-- Fixtures: 55 listings named with a made-up word ("zorblax"). Listing N
-- carries the keywords `zorbtag-01` through `zorbtag-N`, so `zorbtag-01` is on
-- all 55 listings and `zorbtag-55` on one. Odd listings come from "Zorblax
-- North", even ones from "Zorblax South". Listings 1 and 2 also carry
-- "Harbour Ferry Routes", listing 3 "ferry", and listing 4 "Ferris wheel".

begin;

set search_path to extensions, public;

insert into public.data_catalog_listings
  (display_name, organization1_name, access_kind,
   parquet_file_name, pipeline_name, pipeline_run_id, tags)
select
  'Zorblax dataset ' || listing_num,
  case when listing_num % 2 = 1 then 'Zorblax North' else 'Zorblax South' end,
  'pipeline_parquet',
  'zorblax-' || listing_num || '.parquet',
  'pgtap-fixture-tag-options',
  'run-1',
  array(
    select 'zorbtag-' || lpad(tag_num::text, 2, '0')
    from generate_series(1, listing_num) as tag_num
  ) || case listing_num
    when 1 then array['Harbour Ferry Routes']
    when 2 then array['Harbour Ferry Routes']
    when 3 then array['ferry']
    when 4 then array['Ferris wheel']
    else array[]::text[]
  end
from generate_series(1, 55) as listing_num;

select plan(10);

-- The keyword facet's top 50

select results_eq(
  $$select count(*)
    from public.data_catalog_listings__search_facet_rows(p_query => 'zorblax')
    where facet = 'tag'$$,
  $$values (50::bigint)$$,
  'the keyword facet lists only the 50 keywords with the most listings'
);

select results_eq(
  $$select value, listing_count
    from public.data_catalog_listings__search_facet_rows(p_query => 'zorblax')
    where facet = 'tag'
    order by listing_count desc, value
    limit 2$$,
  $$values ('zorbtag-01'::text, 55::bigint), ('zorbtag-02', 54)$$,
  'the keyword facet keeps the keywords with the most listings first'
);

select results_eq(
  $$select listing_count
    from public.data_catalog_listings__search_facet_rows(
      p_query => 'zorblax', p_tags => array['zorbtag-55'])
    where facet = 'tag' and value = 'zorbtag-55'$$,
  $$values (1::bigint)$$,
  'a chosen keyword outside the top 50 is still listed, with its count'
);

-- Searching the keywords

select results_eq(
  $$select value, listing_count
    from public.rpc_data_catalog_listings__search_tag_options(
      p_tag_search => 'FERRY rou', p_query => 'zorblax')$$,
  $$values ('Harbour Ferry Routes'::text, 2::bigint)$$,
  'a keyword matches when it contains every typed fragment, in any case'
);

select results_eq(
  $$select value, listing_count
    from public.rpc_data_catalog_listings__search_tag_options(
      p_tag_search => 'ferr', p_query => 'zorblax')$$,
  $$values ('Harbour Ferry Routes'::text, 2::bigint), ('Ferris wheel', 1),
           ('ferry', 1)$$,
  'matching keywords come back with the most listings first, then by name'
);

select results_eq(
  $$select count(*)
    from public.rpc_data_catalog_listings__search_tag_options(
      p_tag_search => 'zorbtag', p_query => 'zorblax')$$,
  $$values (50::bigint)$$,
  'a keyword search returns at most 50 keywords'
);

select results_eq(
  $$select listing_count
    from public.rpc_data_catalog_listings__search_tag_options(
      p_tag_search => 'zorbtag-02', p_query => 'zorblax',
      p_sources => array['Zorblax South'], p_tags => array['zorbtag-55'])$$,
  $$values (27::bigint)$$,
  'a keyword search counts over every filter but the keyword filter'
);

select is_empty(
  $$select value
    from public.rpc_data_catalog_listings__search_tag_options(
      p_tag_search => '   ', p_query => 'zorblax')$$,
  'a blank keyword search returns no keywords'
);

-- Privileges

select ok(
  has_function_privilege(
    'authenticated',
    'public.rpc_data_catalog_listings__search_tag_options(text, text, text[], text[], text, boolean, text[], text[], text[])',
    'execute'
  ),
  'a signed-in user may search the catalog''s keywords'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_data_catalog_listings__search_tag_options(text, text, text[], text[], text, boolean, text[], text[], text[])',
    'execute'
  ),
  'a signed-out visitor may not search the catalog''s keywords'
);

select * from finish();

rollback;
