\set ON_ERROR_STOP on

-- Fixtures: one `api_resource` listing and one `pipeline_parquet` listing.
-- Identifiers are `pgtap-fixture`-prefixed and hosts are `.invalid`.

begin;

set search_path to extensions, public;

insert into public.data_catalog_listings
  (id, display_name, organization1_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format,
   pipeline_name, pipeline_run_id)
values
  ('e9006001-0000-4000-8000-000000000001'::uuid, 'violations', 'Fixture Org',
   'api_resource', 'socrata', 'https://pgtap-fixture-a.invalid',
   'pgtap-fixture-violations', 'r1', 'CSV', 'pgtap-fixture-pipeline', 'run-1');

insert into public.data_catalog_listings
  (id, display_name, organization1_name, access_kind, parquet_file_name,
   pipeline_name, pipeline_run_id)
values
  ('e9006002-0000-4000-8000-000000000002'::uuid, 'indicators', 'Fixture Org',
   'pipeline_parquet', 'pgtap-fixture-indicators.parquet',
   'pgtap-fixture-pipeline', 'run-1');

create temporary table build_ids (label text primary key, build_id uuid);

grant all on build_ids to service_role;

select plan(22);

select results_eq(
  $$select parquet_cache_status::text, parquet_cache_object_path
    from public.data_catalog_listings
    where id = 'e9006001-0000-4000-8000-000000000001'::uuid$$,
  $$values (null::text, null::text)$$,
  'a new listing has no Parquet copy and no build'
);

-- Requesting a build claims it.
insert into build_ids
select 'first', public.rpc_data_catalog_listings__request_parquet_cache(
  'e9006001-0000-4000-8000-000000000001'::uuid, interval '30 minutes');

select isnt(
  (select build_id from build_ids where label = 'first'),
  null,
  'the first request claims a build'
);

select results_eq(
  $$select parquet_cache_status::text,
      parquet_cache_build_started_at is not null
    from public.data_catalog_listings
    where id = 'e9006001-0000-4000-8000-000000000001'::uuid$$,
  $$values ('building', true)$$,
  'a claimed build is recorded as building, with when it started'
);

select is(
  public.rpc_data_catalog_listings__request_parquet_cache(
    'e9006001-0000-4000-8000-000000000001'::uuid, interval '30 minutes'),
  null,
  'a second request while the build runs claims nothing'
);

-- A build that has run longer than the caller allows is treated as lost.
insert into build_ids
select 'reclaimed', public.rpc_data_catalog_listings__request_parquet_cache(
  'e9006001-0000-4000-8000-000000000001'::uuid, interval '0 seconds');

select ok(
  (select build_id from build_ids where label = 'reclaimed') is not null and
  (select build_id from build_ids where label = 'reclaimed') <>
    (select build_id from build_ids where label = 'first'),
  'a lost build is claimed again under a new build id'
);

select results_eq(
  $$select is_applied, previous_object_path
    from public.rpc_data_catalog_listings__write_parquet_cache(
      'e9006001-0000-4000-8000-000000000001'::uuid,
      (select build_id from build_ids where label = 'first'),
      'catalog-cache/e9006001/aaaaaaaaaaaaaaaa.parquet', 'v1', 10, 100)$$,
  $$values (false, null::text)$$,
  'a superseded build cannot write its copy'
);

select results_eq(
  $$select is_applied, previous_object_path
    from public.rpc_data_catalog_listings__write_parquet_cache(
      'e9006001-0000-4000-8000-000000000001'::uuid,
      (select build_id from build_ids where label = 'reclaimed'),
      'catalog-cache/e9006001/aaaaaaaaaaaaaaaa.parquet', 'v1', 10, 100)$$,
  $$values (true, null::text)$$,
  'the current build writes its copy'
);

select results_eq(
  $$select parquet_cache_status::text, parquet_cache_object_path,
      parquet_cache_source_version, parquet_cache_row_count,
      parquet_cache_byte_size, parquet_cache_built_at is not null,
      parquet_cache_build_id
    from public.data_catalog_listings
    where id = 'e9006001-0000-4000-8000-000000000001'::uuid$$,
  $$values ('ready', 'catalog-cache/e9006001/aaaaaaaaaaaaaaaa.parquet',
    'v1', 10::bigint, 100::bigint, true, null::uuid)$$,
  'a written copy is ready and says what it holds'
);

-- A rebuild keeps serving the old copy until the new one is written.
insert into build_ids
select 'rebuild', public.rpc_data_catalog_listings__request_parquet_cache(
  'e9006001-0000-4000-8000-000000000001'::uuid, interval '30 minutes');

select results_eq(
  $$select parquet_cache_status::text, parquet_cache_object_path
    from public.data_catalog_listings
    where id = 'e9006001-0000-4000-8000-000000000001'::uuid$$,
  $$values ('building',
    'catalog-cache/e9006001/aaaaaaaaaaaaaaaa.parquet')$$,
  'a rebuild keeps the current copy while it runs'
);

select results_eq(
  $$select is_applied, previous_object_path
    from public.rpc_data_catalog_listings__write_parquet_cache(
      'e9006001-0000-4000-8000-000000000001'::uuid,
      (select build_id from build_ids where label = 'rebuild'),
      'catalog-cache/e9006001/bbbbbbbbbbbbbbbb.parquet', 'v2', 12, 120)$$,
  $$values (true, 'catalog-cache/e9006001/aaaaaaaaaaaaaaaa.parquet')$$,
  'writing a new copy returns the one it replaced, for deletion'
);

-- A failed build keeps the copy it was replacing.
insert into build_ids
select 'failing', public.rpc_data_catalog_listings__request_parquet_cache(
  'e9006001-0000-4000-8000-000000000001'::uuid, interval '30 minutes');

select is(
  public.rpc_data_catalog_listings__fail_parquet_cache(
    'e9006001-0000-4000-8000-000000000001'::uuid,
    (select build_id from build_ids where label = 'first'),
    'resource-unreachable'),
  false,
  'a superseded build cannot record a failure'
);

select is(
  public.rpc_data_catalog_listings__fail_parquet_cache(
    'e9006001-0000-4000-8000-000000000001'::uuid,
    (select build_id from build_ids where label = 'failing'),
    'resource-unreachable'),
  true,
  'the current build records its failure'
);

select results_eq(
  $$select parquet_cache_status::text, parquet_cache_failure_code,
      parquet_cache_object_path
    from public.data_catalog_listings
    where id = 'e9006001-0000-4000-8000-000000000001'::uuid$$,
  $$values ('failed', 'resource-unreachable',
    'catalog-cache/e9006001/bbbbbbbbbbbbbbbb.parquet')$$,
  'a failed build keeps the last good copy'
);

select isnt(
  public.rpc_data_catalog_listings__request_parquet_cache(
    'e9006001-0000-4000-8000-000000000001'::uuid, interval '30 minutes'),
  null,
  'a failed build can be requested again'
);

select results_eq(
  $$select parquet_cache_failure_code
    from public.data_catalog_listings
    where id = 'e9006001-0000-4000-8000-000000000001'::uuid$$,
  $$values (null::text)$$,
  'a new build clears the last failure'
);

select throws_ok(
  $$select public.rpc_data_catalog_listings__request_parquet_cache(
      'e9006002-0000-4000-8000-000000000002'::uuid, interval '30 minutes')$$,
  'P0001',
  'Catalog listing e9006002-0000-4000-8000-000000000002 is not API-backed, so it has no Parquet copy to build',
  'a pipeline listing never gets a Parquet copy'
);

select throws_ok(
  $$select public.rpc_data_catalog_listings__request_parquet_cache(
      'e9006099-0000-4000-8000-000000000099'::uuid, interval '30 minutes')$$,
  'P0001',
  'Catalog listing e9006099-0000-4000-8000-000000000099 does not exist',
  'a missing listing is refused'
);

select throws_ok(
  $$update public.data_catalog_listings
    set parquet_cache_status = 'ready',
      parquet_cache_object_path = null,
      parquet_cache_source_version = null,
      parquet_cache_built_at = null,
      parquet_cache_row_count = null,
      parquet_cache_byte_size = null,
      parquet_cache_build_id = null,
      parquet_cache_failure_code = null
    where id = 'e9006001-0000-4000-8000-000000000001'::uuid$$,
  '23514',
  null,
  'a ready listing must have a copy'
);

select throws_ok(
  $$update public.data_catalog_listings
    set parquet_cache_status = 'building',
      parquet_cache_object_path = 'catalog-cache/x/y.parquet',
      parquet_cache_source_version = 'v1',
      parquet_cache_built_at = now(),
      parquet_cache_row_count = 1,
      parquet_cache_byte_size = 1
    where id = 'e9006002-0000-4000-8000-000000000002'::uuid$$,
  '23514',
  null,
  'a pipeline listing cannot carry a Parquet copy'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.rpc_data_catalog_listings__request_parquet_cache(uuid, interval)',
    'execute'
  ) and
  not has_function_privilege(
    'authenticated',
    'public.rpc_data_catalog_listings__write_parquet_cache(uuid, uuid, text, text, bigint, bigint)',
    'execute'
  ) and
  not has_function_privilege(
    'authenticated',
    'public.rpc_data_catalog_listings__fail_parquet_cache(uuid, uuid, text)',
    'execute'
  ),
  'a signed-in user may not manage Parquet copies directly'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_data_catalog_listings__request_parquet_cache(uuid, interval)',
    'execute'
  ) and
  not has_function_privilege(
    'anon',
    'public.rpc_data_catalog_listings__write_parquet_cache(uuid, uuid, text, text, bigint, bigint)',
    'execute'
  ) and
  not has_function_privilege(
    'anon',
    'public.rpc_data_catalog_listings__fail_parquet_cache(uuid, uuid, text)',
    'execute'
  ),
  'an anonymous visitor may not manage Parquet copies'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.rpc_data_catalog_listings__request_parquet_cache(uuid, interval)',
    'execute'
  ) and
  has_function_privilege(
    'service_role',
    'public.rpc_data_catalog_listings__write_parquet_cache(uuid, uuid, text, text, bigint, bigint)',
    'execute'
  ) and
  has_function_privilege(
    'service_role',
    'public.rpc_data_catalog_listings__fail_parquet_cache(uuid, uuid, text)',
    'execute'
  ),
  'the service role manages Parquet copies'
);

select * from finish();

rollback;
