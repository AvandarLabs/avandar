\set ON_ERROR_STOP on

-- What "Hide datasets that can't be loaded" hides, in
-- `rpc_data_catalog_listings__search` and the `unloadable` count of
-- `rpc_data_catalog_listings__search_facets`. A listing cannot be loaded when
-- its pipeline flagged it as an asset Avandar does not load yet
-- (`is_workspace_loadable` false), or when a sample of its data failed
-- (`is_invalid`).
--
-- Fixtures: three listings named with a made-up word ("wobblethorn") so every
-- query below matches only them. One loads, one is a map no workspace can add,
-- and one is a supported file whose sample came back empty.

begin;

set search_path to extensions, public;

insert into public.data_catalog_listings
  (id, display_name, organization1_name, access_kind,
   parquet_file_name, pipeline_name, pipeline_run_id,
   api_service, api_base_url, api_resource_id, api_resource_format,
   external_dataset_id, date_of_last_update,
   is_invalid, invalid_dataset_reason, is_workspace_loadable)
values
  ('e9008001-0000-4000-8000-000000000001'::uuid,
   'Wobblethorn clinic visits', 'Fixture Loadable Agency', 'api_resource',
   null, null, null,
   'socrata', 'https://wobblethorn.example.org', 'wb-0001', 'csv',
   'wb-0001', now() - interval '10 days',
   false, null, true),
  ('e9008001-0000-4000-8000-000000000002'::uuid,
   'Wobblethorn clinic map', 'Fixture Loadable Agency', 'api_resource',
   null, null, null,
   'socrata', 'https://wobblethorn.example.org', 'wb-0002', 'csv',
   'wb-0002', now() - interval '10 days',
   false, null, false),
  ('e9008001-0000-4000-8000-000000000003'::uuid,
   'Wobblethorn clinic empty file', 'Fixture Loadable Agency', 'api_resource',
   null, null, null,
   'socrata', 'https://wobblethorn.example.org', 'wb-0003', 'csv',
   'wb-0003', now() - interval '10 days',
   true, 'empty_dataset', true);

select plan(4);

select bag_eq(
  $$select id from public.rpc_data_catalog_listings__search(
    p_query => 'wobblethorn')$$,
  $$values
    ('e9008001-0000-4000-8000-000000000001'::uuid),
    ('e9008001-0000-4000-8000-000000000002'::uuid),
    ('e9008001-0000-4000-8000-000000000003'::uuid)$$,
  'without loadable only, every listing shows'
);

select results_eq(
  $$select id from public.rpc_data_catalog_listings__search(
    p_query => 'wobblethorn', p_is_loadable_only => true)$$,
  $$values ('e9008001-0000-4000-8000-000000000001'::uuid)$$,
  'loadable only hides an asset no workspace can add, and an invalid one'
);

select results_eq(
  $$select listing_count
    from public.data_catalog_listings__search_facet_rows(
      p_query => 'wobblethorn')
    where facet = 'unloadable'$$,
  $$values (2::bigint)$$,
  'the unloadable count includes assets no workspace can add'
);

select results_eq(
  $$select listing_count
    from public.data_catalog_listings__search_facet_rows(
      p_query => 'wobblethorn', p_is_loadable_only => true)
    where facet = 'unloadable'$$,
  $$values (2::bigint)$$,
  'the unloadable count ignores its own filter'
);

select * from finish();

rollback;
