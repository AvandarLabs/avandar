\set ON_ERROR_STOP on

-- Fixtures: one `api_resource` listing. Identifiers are
-- `pgtap-fixture`-prefixed and hosts are `.invalid`.

begin;

set search_path to extensions, public;

insert into public.data_catalog_listings
  (id, display_name, organization1_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format,
   api_freshness_probe)
values
  ('ed006001-0000-4000-8000-000000000001'::uuid, 'Measles cases',
   'Fixture Org', 'api_resource', 'odata', 'https://pgtap-fixture-gho.invalid',
   'WHS3_62', 'WHS3_62', 'ODATA',
   '{"url": "https://pgtap-fixture-gho.invalid/WHS3_62?$top=1",
     "token": {"kind": "body-sha256"}}'::jsonb);

create temporary table build_ids (build_id uuid);

grant all on build_ids to service_role;

select plan(8);

select ok(
  has_function_privilege(
    'service_role',
    'public.rpc_data_catalog_listings__record_freshness_check(uuid, text)',
    'execute'
  ) and not has_function_privilege(
    'authenticated',
    'public.rpc_data_catalog_listings__record_freshness_check(uuid, text)',
    'execute'
  ),
  'only the service role may record a freshness check'
);

select results_eq(
  $$select parquet_cache_checked_at, parquet_cache_checked_source_version
    from public.data_catalog_listings
    where id = 'ed006001-0000-4000-8000-000000000001'::uuid$$,
  $$values (null::timestamptz, null::text)$$,
  'a new listing has never been checked'
);

select ok(
  public.rpc_data_catalog_listings__record_freshness_check(
    'ed006001-0000-4000-8000-000000000001'::uuid, 'token-1'),
  'recording a check on a listing that exists succeeds'
);

select results_eq(
  $$select parquet_cache_checked_at is not null,
      parquet_cache_checked_source_version
    from public.data_catalog_listings
    where id = 'ed006001-0000-4000-8000-000000000001'::uuid$$,
  $$values (true, 'token-1')$$,
  'a check records when it ran and what it read'
);

select ok(
  not public.rpc_data_catalog_listings__record_freshness_check(
    'ed006009-0000-4000-8000-000000000009'::uuid, 'token-1'),
  'recording a check on a missing listing reports it'
);

select throws_ok(
  $$update public.data_catalog_listings
    set parquet_cache_checked_source_version = null
    where id = 'ed006001-0000-4000-8000-000000000001'::uuid$$,
  '23514',
  null,
  'a check cannot record a time without a token'
);

-- Writing a built copy makes the build's token the latest check, so an
-- older check cannot call the new copy stale.
insert into build_ids
select public.rpc_data_catalog_listings__request_parquet_cache(
  'ed006001-0000-4000-8000-000000000001'::uuid, interval '30 minutes');

select results_eq(
  $$select is_applied
    from public.rpc_data_catalog_listings__write_parquet_cache(
      'ed006001-0000-4000-8000-000000000001'::uuid,
      (select build_id from build_ids),
      'catalog-cache/ed006001/build-1', 1, 'token-2', 10, 100)$$,
  $$values (true)$$,
  'the build records its copy'
);

select results_eq(
  $$select parquet_cache_checked_source_version
    from public.data_catalog_listings
    where id = 'ed006001-0000-4000-8000-000000000001'::uuid$$,
  $$values ('token-2')$$,
  'a written copy becomes the latest freshness check'
);

select * from finish();

rollback;
