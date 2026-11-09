\set ON_ERROR_STOP on

-- Fixtures: a workspace owner, an outsider, and an `odata` drive holding an
-- indicator listing that names three companions: a country list the
-- workspace already has, a region list, and a dimension no listing holds
-- yet. A same-named listing in another drive must not match. Identifiers are
-- `pgtap-fixture`-prefixed and hosts are `.invalid`.

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('ec000001-0000-4000-8000-000000000001'::uuid, 'ec_owner@test.dev',
   'authenticated', 'authenticated'),
  ('ec000002-0000-4000-8000-000000000002'::uuid, 'ec_outsider@test.dev',
   'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'ec001001-0000-4000-8000-000000000001'::uuid,
  'ec000001-0000-4000-8000-000000000001'::uuid,
  'ec workspace',
  'ec-companions-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values (
  'ec002001-0000-4000-8000-000000000001'::uuid,
  'ec001001-0000-4000-8000-000000000001'::uuid,
  'ec000001-0000-4000-8000-000000000001'::uuid,
  null
);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values (
  'ec003001-0000-4000-8000-000000000001'::uuid,
  'ec000001-0000-4000-8000-000000000001'::uuid,
  'ec001001-0000-4000-8000-000000000001'::uuid,
  'ec002001-0000-4000-8000-000000000001'::uuid,
  'EC Owner',
  'EC Owner'
);

insert into public.data_catalog_listings
  (id, display_name, organization1_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format,
   date_column_type_last_verified, companion_listings)
values
  ('ec004001-0000-4000-8000-000000000001'::uuid, 'Measles cases',
   'Fixture Org', 'api_resource', 'odata', 'https://pgtap-fixture-gho.invalid',
   'WHS3_62', 'WHS3_62', 'ODATA', '2026-11-09T00:00:00Z',
   '[
     {"kind": "lookup", "externalDatasetId": "DIMENSION/REGION",
      "apiResourceId": "DIMENSION/REGION/DimensionValues",
      "joinOn": [{"column": "SpatialDimType", "companionColumn": "Dimension"},
                 {"column": "SpatialDim", "companionColumn": "Code"}]},
     {"kind": "lookup", "externalDatasetId": "DIMENSION/MISSING",
      "apiResourceId": "DIMENSION/MISSING/DimensionValues", "joinOn": []},
     {"kind": "lookup", "externalDatasetId": "DIMENSION/COUNTRY",
      "apiResourceId": "DIMENSION/COUNTRY/DimensionValues",
      "joinOn": [{"column": "SpatialDimType", "companionColumn": "Dimension"},
                 {"column": "SpatialDim", "companionColumn": "Code"}]},
     {"kind": "lookup", "externalDatasetId": "WHS3_62",
      "apiResourceId": "WHS3_62", "joinOn": []}
   ]'::jsonb),
  ('ec004002-0000-4000-8000-000000000002'::uuid,
   'Country (GHO dimension values)', 'Fixture Org', 'api_resource', 'odata',
   'https://pgtap-fixture-gho.invalid', 'DIMENSION/COUNTRY',
   'DIMENSION/COUNTRY/DimensionValues', 'ODATA', '2026-11-09T00:00:00Z', '[]'),
  ('ec004003-0000-4000-8000-000000000003'::uuid,
   'WHO region (GHO dimension values)', 'Fixture Org', 'api_resource',
   'odata', 'https://pgtap-fixture-gho.invalid', 'DIMENSION/REGION',
   'DIMENSION/REGION/DimensionValues', 'ODATA', '2026-11-09T00:00:00Z', '[]'),
  ('ec004004-0000-4000-8000-000000000004'::uuid,
   'Country from another drive', 'Fixture Org', 'api_resource', 'odata',
   'https://pgtap-fixture-other.invalid', 'DIMENSION/COUNTRY',
   'DIMENSION/COUNTRY/DimensionValues', 'ODATA', '2026-11-09T00:00:00Z', '[]');

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values (
  'ec005001-0000-4000-8000-000000000001'::uuid,
  'ec001001-0000-4000-8000-000000000001'::uuid,
  'ec000001-0000-4000-8000-000000000001'::uuid,
  'ec003001-0000-4000-8000-000000000001'::uuid,
  'Countries', 'open_data'::public.datasets__source_type
);

insert into public.datasets__open_data (dataset_id, workspace_id, catalog_listing_id)
values (
  'ec005001-0000-4000-8000-000000000001'::uuid,
  'ec001001-0000-4000-8000-000000000001'::uuid,
  'ec004002-0000-4000-8000-000000000002'::uuid
);

select plan(6);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_data_catalog_listings__get_companions(uuid, uuid)',
    'execute'
  ),
  'a signed-out visitor may not read recommendations'
);

select throws_ok(
  $$update public.data_catalog_listings
    set companion_listings = '{}'::jsonb
    where id = 'ec004002-0000-4000-8000-000000000002'::uuid$$,
  '23514',
  null,
  'companion_listings must be a JSON array'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ec000001-0000-4000-8000-000000000001","role":"authenticated"}', true);

select results_eq(
  $$select catalog_listing_id, kind, is_in_workspace
    from public.rpc_data_catalog_listings__get_companions(
      'ec004001-0000-4000-8000-000000000001'::uuid,
      'ec001001-0000-4000-8000-000000000001'::uuid)$$,
  $$values
    ('ec004003-0000-4000-8000-000000000003'::uuid, 'lookup', false),
    ('ec004002-0000-4000-8000-000000000002'::uuid, 'lookup', true)$$,
  'companions resolve in their listed order, within the drive, skipping unresolved members and the listing itself'
);

select is(
  (select join_on
    from public.rpc_data_catalog_listings__get_companions(
      'ec004001-0000-4000-8000-000000000001'::uuid,
      'ec001001-0000-4000-8000-000000000001'::uuid)
    where catalog_listing_id = 'ec004002-0000-4000-8000-000000000002'::uuid),
  '[{"column": "SpatialDimType", "companionColumn": "Dimension"},
    {"column": "SpatialDim", "companionColumn": "Code"}]'::jsonb,
  'a companion carries the column pairs that join it'
);

select is_empty(
  $$select 1 from public.rpc_data_catalog_listings__get_companions(
      'ec004002-0000-4000-8000-000000000002'::uuid,
      'ec001001-0000-4000-8000-000000000001'::uuid)$$,
  'a listing with no companions lists none'
);

select set_config('request.jwt.claims', '{"sub":"ec000002-0000-4000-8000-000000000002","role":"authenticated"}', true);

select results_eq(
  $$select bool_or(is_in_workspace)
    from public.rpc_data_catalog_listings__get_companions(
      'ec004001-0000-4000-8000-000000000001'::uuid,
      'ec001001-0000-4000-8000-000000000001'::uuid)$$,
  $$values (false)$$,
  'a caller outside the workspace cannot see which companions it has'
);

select * from finish();

rollback;
