\set ON_ERROR_STOP on

-- Fixtures: a workspace with two datasets, and two `api_resource` listings,
-- one with verified column types and one without. Identifiers are
-- `pgtap-fixture`-prefixed and hosts are `.invalid`.

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values (
  'ea000001-0000-4000-8000-000000000001'::uuid,
  'ea_owner@test.dev',
  'authenticated',
  'authenticated'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'ea001001-0000-4000-8000-000000000001'::uuid,
  'ea000001-0000-4000-8000-000000000001'::uuid,
  'ea workspace',
  'ea-verified-columns-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values (
  'ea002001-0000-4000-8000-000000000001'::uuid,
  'ea001001-0000-4000-8000-000000000001'::uuid,
  'ea000001-0000-4000-8000-000000000001'::uuid,
  null
);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values (
  'ea003001-0000-4000-8000-000000000001'::uuid,
  'ea000001-0000-4000-8000-000000000001'::uuid,
  'ea001001-0000-4000-8000-000000000001'::uuid,
  'ea002001-0000-4000-8000-000000000001'::uuid,
  'EA Owner',
  'EA Owner'
);

insert into public.data_catalog_listings
  (id, display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format,
   date_column_type_last_verified)
values
  ('ea004001-0000-4000-8000-000000000001'::uuid, 'verified', 'Fixture Org',
   'api_resource', 'socrata', 'https://pgtap-fixture-a.invalid',
   'pgtap-fixture-verified', 'r1', 'CSV', '2026-10-01T00:00:00Z'),
  ('ea004002-0000-4000-8000-000000000002'::uuid, 'unverified', 'Fixture Org',
   'api_resource', 'socrata', 'https://pgtap-fixture-a.invalid',
   'pgtap-fixture-unverified', 'r2', 'CSV', null);

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values
  ('ea005001-0000-4000-8000-000000000001'::uuid,
   'ea001001-0000-4000-8000-000000000001'::uuid,
   'ea000001-0000-4000-8000-000000000001'::uuid,
   'ea003001-0000-4000-8000-000000000001'::uuid,
   'from verified', 'open_data'::public.datasets__source_type),
  ('ea005002-0000-4000-8000-000000000002'::uuid,
   'ea001001-0000-4000-8000-000000000001'::uuid,
   'ea000001-0000-4000-8000-000000000001'::uuid,
   'ea003001-0000-4000-8000-000000000001'::uuid,
   'from unverified', 'open_data'::public.datasets__source_type);

select plan(3);

select lives_ok(
  $$insert into public.datasets__open_data (dataset_id, workspace_id, catalog_listing_id)
    values ('ea005001-0000-4000-8000-000000000001'::uuid,
      'ea001001-0000-4000-8000-000000000001'::uuid,
      'ea004001-0000-4000-8000-000000000001'::uuid)$$,
  'a dataset can be added from a listing with verified column types'
);

select throws_ok(
  $$insert into public.datasets__open_data (dataset_id, workspace_id, catalog_listing_id)
    values ('ea005002-0000-4000-8000-000000000002'::uuid,
      'ea001001-0000-4000-8000-000000000001'::uuid,
      'ea004002-0000-4000-8000-000000000002'::uuid)$$,
  'P0001',
  'Catalog listing ea004002-0000-4000-8000-000000000002 has unverified column types, so it cannot be added to a workspace yet',
  'a dataset cannot be added from a listing with unverified column types'
);

select throws_ok(
  $$update public.datasets__open_data
    set catalog_listing_id = 'ea004002-0000-4000-8000-000000000002'::uuid
    where dataset_id = 'ea005001-0000-4000-8000-000000000001'::uuid$$,
  'P0001',
  'Catalog listing ea004002-0000-4000-8000-000000000002 has unverified column types, so it cannot be added to a workspace yet',
  'a dataset cannot be moved onto a listing with unverified column types'
);

select * from finish();

rollback;
