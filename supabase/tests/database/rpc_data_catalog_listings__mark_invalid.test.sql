\set ON_ERROR_STOP on

-- Fixtures: one valid `api_resource` listing. Identifiers are
-- `pgtap-fixture`-prefixed and hosts are `.invalid`.

begin;

set search_path to extensions, public;

insert into public.data_catalog_listings
  (id, display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format,
   pipeline_name, pipeline_run_id)
values
  ('e9005001-0000-4000-8000-000000000001'::uuid, 'empty file', 'Fixture Org',
   'api_resource', 'ckan', 'https://pgtap-fixture-a.invalid',
   'pgtap-fixture-empty', 'r1', 'CSV', 'pgtap-fixture-pipeline', 'run-1');

select plan(9);

select results_eq(
  $$select is_invalid, invalid_dataset_reason::text
    from public.data_catalog_listings
    where id = 'e9005001-0000-4000-8000-000000000001'::uuid$$,
  $$values (false, null::text)$$,
  'a new listing is valid, with no reason'
);

select throws_ok(
  $$update public.data_catalog_listings
    set is_invalid = true
    where id = 'e9005001-0000-4000-8000-000000000001'::uuid$$,
  '23514',
  null,
  'an invalid listing must say why'
);

select throws_ok(
  $$update public.data_catalog_listings
    set invalid_dataset_reason = 'empty_dataset'
    where id = 'e9005001-0000-4000-8000-000000000001'::uuid$$,
  '23514',
  null,
  'a valid listing carries no reason'
);

select throws_ok(
  $$select public.rpc_data_catalog_listings__mark_invalid(
      'e9005001-0000-4000-8000-000000000001'::uuid, null)$$,
  'P0001',
  'rpc_data_catalog_listings__mark_invalid needs a listing id and a reason',
  'a missing reason is refused'
);

select throws_ok(
  $$select public.rpc_data_catalog_listings__mark_invalid(
      'e9005099-0000-4000-8000-000000000099'::uuid, 'empty_dataset')$$,
  'P0001',
  'Catalog listing e9005099-0000-4000-8000-000000000099 does not exist',
  'a missing listing is refused'
);

select results_eq(
  $$select is_invalid, invalid_dataset_reason::text
    from public.rpc_data_catalog_listings__mark_invalid(
      'e9005001-0000-4000-8000-000000000001'::uuid, 'empty_dataset')$$,
  $$values (true, 'empty_dataset')$$,
  'the listing is marked invalid with its reason'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.rpc_data_catalog_listings__mark_invalid(uuid, public.data_catalog_listings__invalid_dataset_reason)',
    'execute'
  ),
  'a signed-in user may not mark a listing invalid directly'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_data_catalog_listings__mark_invalid(uuid, public.data_catalog_listings__invalid_dataset_reason)',
    'execute'
  ),
  'an anonymous visitor may not mark a listing invalid'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.rpc_data_catalog_listings__mark_invalid(uuid, public.data_catalog_listings__invalid_dataset_reason)',
    'execute'
  ),
  'the service role may mark a listing invalid'
);

select * from finish();

rollback;
