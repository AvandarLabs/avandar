\set ON_ERROR_STOP on

-- Fixtures: a workspace with one dataset, and `api_resource` listings that a
-- workspace can and cannot load. Identifiers are `pgtap-fixture`-prefixed and
-- hosts are `.invalid`.

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values (
  'eb000001-0000-4000-8000-000000000001'::uuid,
  'eb_owner@test.dev',
  'authenticated',
  'authenticated'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'eb001001-0000-4000-8000-000000000001'::uuid,
  'eb000001-0000-4000-8000-000000000001'::uuid,
  'eb workspace',
  'eb-loadable-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values (
  'eb002001-0000-4000-8000-000000000001'::uuid,
  'eb001001-0000-4000-8000-000000000001'::uuid,
  'eb000001-0000-4000-8000-000000000001'::uuid,
  null
);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values (
  'eb003001-0000-4000-8000-000000000001'::uuid,
  'eb000001-0000-4000-8000-000000000001'::uuid,
  'eb001001-0000-4000-8000-000000000001'::uuid,
  'eb002001-0000-4000-8000-000000000001'::uuid,
  'EB Owner',
  'EB Owner'
);

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values (
  'eb005001-0000-4000-8000-000000000001'::uuid,
  'eb001001-0000-4000-8000-000000000001'::uuid,
  'eb000001-0000-4000-8000-000000000001'::uuid,
  'eb003001-0000-4000-8000-000000000001'::uuid,
  'from unloadable',
  'open_data'::public.datasets__source_type
);

select plan(9);

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

select col_default_is(
  'public',
  'data_catalog_listings',
  'is_workspace_loadable',
  'true',
  'a listing is loadable unless something says otherwise'
);

select col_is_null(
  'public',
  'data_catalog_listings',
  'source_download_url',
  'source_download_url is optional'
);

-- ---------------------------------------------------------------------------
-- An unloadable API listing needs no format. A loadable one still does.
-- ---------------------------------------------------------------------------

select lives_ok(
  $$insert into public.data_catalog_listings
      (id, display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format,
       is_workspace_loadable, source_asset_type, source_url,
       date_column_type_last_verified)
    values ('eb004001-0000-4000-8000-000000000001'::uuid, 'a map',
      'Fixture Org', 'api_resource', 'socrata',
      'https://pgtap-fixture-a.invalid', 'pgtap-fixture-map', 'pgtap-fixture-map',
      null, false, 'map', 'https://pgtap-fixture-a.invalid/d/map',
      '2026-10-01T00:00:00Z')$$,
  'an unloadable API listing may have no format'
);

select throws_ok(
  $$insert into public.data_catalog_listings
      (display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format,
       is_workspace_loadable)
    values ('no format', 'Fixture Org', 'api_resource', 'socrata',
      'https://pgtap-fixture-a.invalid', 'pgtap-fixture-no-format',
      'pgtap-fixture-no-format', null, true)$$,
  '23514',
  null,
  'a loadable API listing still needs a format'
);

-- ---------------------------------------------------------------------------
-- A workspace cannot add an unloadable listing, even one with verified types
-- ---------------------------------------------------------------------------

select throws_ok(
  $$insert into public.datasets__open_data (dataset_id, workspace_id, catalog_listing_id)
    values ('eb005001-0000-4000-8000-000000000001'::uuid,
      'eb001001-0000-4000-8000-000000000001'::uuid,
      'eb004001-0000-4000-8000-000000000001'::uuid)$$,
  'P0001',
  'Catalog listing eb004001-0000-4000-8000-000000000001 is not supported in a workspace, so it cannot be added',
  'a dataset cannot be added from an unloadable listing'
);

-- ---------------------------------------------------------------------------
-- The pipeline upsert writes the loadability columns
-- ---------------------------------------------------------------------------

select lives_ok(
  $$select * from public.rpc_data_catalog_listings__upsert_with_relation_columns(
      jsonb_build_array(jsonb_build_object(
        'listing', jsonb_build_object(
          'access_kind', 'api_resource',
          'pipeline_name', 'pgtap-fixture-pipeline',
          'pipeline_run_id', 'run-1',
          'display_name', 'a pdf',
          'external_organization_name', 'Fixture Org',
          'external_dataset_id', 'pgtap-fixture-pdf',
          'date_of_last_sync', '2026-10-22T00:00:00Z',
          'api_service', 'socrata',
          'api_base_url', 'https://pgtap-fixture-a.invalid',
          'api_resource_id', 'pgtap-fixture-pdf',
          'api_resource_format', 'PDF',
          'is_workspace_loadable', false,
          'source_asset_type', 'file',
          'source_url', 'https://pgtap-fixture-a.invalid/d/pdf',
          'source_download_url', 'https://pgtap-fixture-a.invalid/download/pdf',
          'pipeline_scope_keys', jsonb_build_array('all')
        ),
        'relation_columns', '[]'::jsonb
      )))$$,
  'the upsert accepts an unloadable listing'
);

select results_eq(
  $$select is_workspace_loadable, source_asset_type, source_download_url
    from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-pdf'$$,
  $$values (false, 'file'::text, 'https://pgtap-fixture-a.invalid/download/pdf'::text)$$,
  'the upsert writes is_workspace_loadable, source_asset_type, and source_download_url'
);

select lives_ok(
  $$select * from public.rpc_data_catalog_listings__upsert_with_relation_columns(
      jsonb_build_array(jsonb_build_object(
        'listing', jsonb_build_object(
          'access_kind', 'api_resource',
          'pipeline_name', 'pgtap-fixture-pipeline',
          'pipeline_run_id', 'run-2',
          'display_name', 'a pdf',
          'external_organization_name', 'Fixture Org',
          'external_dataset_id', 'pgtap-fixture-pdf',
          'date_of_last_sync', '2026-10-23T00:00:00Z',
          'api_service', 'socrata',
          'api_base_url', 'https://pgtap-fixture-a.invalid',
          'api_resource_id', 'pgtap-fixture-pdf',
          'api_resource_format', 'PDF',
          'is_workspace_loadable', true,
          'pipeline_scope_keys', jsonb_build_array('all')
        ),
        'relation_columns', '[]'::jsonb
      )))$$,
  'the upsert rewrites a listing whose support changed'
);

select results_eq(
  $$select is_workspace_loadable, source_download_url
    from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-pdf'$$,
  $$values (true, null::text)$$,
  'a rewrite replaces the loadability columns rather than keeping the stored ones'
);

select * from finish();

rollback;
