\set ON_ERROR_STOP on

-- Fixtures: one pipeline with listings on two drives, A and B, across two
-- scopes, `old` and `new`, plus a workspace dataset added from one of them.
-- Identifiers are `pgtap-fixture`-prefixed and hosts are `.invalid`.

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values (
  'e7000001-0000-4000-8000-000000000001'::uuid,
  'e7_owner@test.dev',
  'authenticated',
  'authenticated'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'e7001001-0000-4000-8000-000000000001'::uuid,
  'e7000001-0000-4000-8000-000000000001'::uuid,
  'e7 workspace',
  'e7-prune-scope-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values (
  'e7002001-0000-4000-8000-000000000001'::uuid,
  'e7001001-0000-4000-8000-000000000001'::uuid,
  'e7000001-0000-4000-8000-000000000001'::uuid,
  null
);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values (
  'e7003001-0000-4000-8000-000000000001'::uuid,
  'e7000001-0000-4000-8000-000000000001'::uuid,
  'e7001001-0000-4000-8000-000000000001'::uuid,
  'e7002001-0000-4000-8000-000000000001'::uuid,
  'E7 Owner',
  'E7 Owner'
);

insert into public.data_catalog_listings
  (id, display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format,
   pipeline_name, pipeline_run_id, pipeline_scope_keys)
values
  ('e7004001-0000-4000-8000-000000000001'::uuid, 'only old', 'Fixture Org',
   'api_resource', 'ckan', 'https://pgtap-fixture-a.invalid',
   'pgtap-fixture-only-old', 'r1', 'CSV', 'pgtap-fixture-pipeline', 'run-1',
   array['old']),
  ('e7004002-0000-4000-8000-000000000002'::uuid, 'shared', 'Fixture Org',
   'api_resource', 'ckan', 'https://pgtap-fixture-a.invalid',
   'pgtap-fixture-shared', 'r2', 'CSV', 'pgtap-fixture-pipeline', 'run-1',
   array['old', 'new']),
  ('e7004003-0000-4000-8000-000000000003'::uuid, 'in use', 'Fixture Org',
   'api_resource', 'ckan', 'https://pgtap-fixture-a.invalid',
   'pgtap-fixture-in-use', 'r3', 'CSV', 'pgtap-fixture-pipeline', 'run-1',
   array['old']),
  ('e7004004-0000-4000-8000-000000000004'::uuid, 'other drive', 'Fixture Org',
   'api_resource', 'ckan', 'https://pgtap-fixture-b.invalid',
   'pgtap-fixture-other-drive', 'r4', 'CSV', 'pgtap-fixture-pipeline', 'run-1',
   array['old']),
  ('e7004005-0000-4000-8000-000000000005'::uuid, 'other scope', 'Fixture Org',
   'api_resource', 'ckan', 'https://pgtap-fixture-a.invalid',
   'pgtap-fixture-other-scope', 'r5', 'CSV', 'pgtap-fixture-pipeline', 'run-1',
   array['new']);

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values (
  'e7005001-0000-4000-8000-000000000001'::uuid,
  'e7001001-0000-4000-8000-000000000001'::uuid,
  'e7000001-0000-4000-8000-000000000001'::uuid,
  'e7003001-0000-4000-8000-000000000001'::uuid,
  'added from in use',
  'open_data'::public.datasets__source_type
);

insert into public.datasets__open_data (dataset_id, workspace_id, catalog_listing_id)
values (
  'e7005001-0000-4000-8000-000000000001'::uuid,
  'e7001001-0000-4000-8000-000000000001'::uuid,
  'e7004003-0000-4000-8000-000000000003'::uuid
);

insert into public.pipeline_scope_checkpoints
  (pipeline_name, drive_key, scope_key, high_water_mark, pipeline_run_id)
values
  ('pgtap-fixture-pipeline', 'https://pgtap-fixture-a.invalid', 'old',
   '2026-10-01T00:00:00Z', 'run-1'),
  ('pgtap-fixture-pipeline', 'https://pgtap-fixture-b.invalid', 'old',
   '2026-10-01T00:00:00Z', 'run-1'),
  ('pgtap-fixture-pipeline', 'https://pgtap-fixture-a.invalid', 'new',
   '2026-10-01T00:00:00Z', 'run-1');

select plan(14);

-- ---------------------------------------------------------------------------
-- Listing stored scopes
-- ---------------------------------------------------------------------------

select results_eq(
  $$select drive_key, scope_key
    from public.rpc_data_catalog_listings__list_pipeline_scopes('pgtap-fixture-pipeline')$$,
  $$values
    ('https://pgtap-fixture-a.invalid', 'new'),
    ('https://pgtap-fixture-a.invalid', 'old'),
    ('https://pgtap-fixture-b.invalid', 'old')$$,
  'lists every stored drive and scope pair once, ordered'
);

-- ---------------------------------------------------------------------------
-- A dry run counts and changes nothing
-- ---------------------------------------------------------------------------

select results_eq(
  $$select * from public.rpc_data_catalog_listings__prune_pipeline_scope(
      'pgtap-fixture-pipeline', 'old', 'https://pgtap-fixture-a.invalid', true)$$,
  $$values (1, 1, 1, 1)$$,
  'a dry run counts one deleted, one kept in use, one detached, one checkpoint'
);

select is(
  (
    select count(*)::integer
    from public.data_catalog_listings
    where pipeline_name = 'pgtap-fixture-pipeline'
  ),
  5,
  'a dry run deletes no listing'
);

-- ---------------------------------------------------------------------------
-- Pruning one drive
-- ---------------------------------------------------------------------------

select results_eq(
  $$select * from public.rpc_data_catalog_listings__prune_pipeline_scope(
      'pgtap-fixture-pipeline', 'old', 'https://pgtap-fixture-a.invalid', false)$$,
  $$values (1, 1, 1, 1)$$,
  'a real run reports what it did with the same counts'
);

select is(
  (
    select count(*)::integer
    from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-only-old'
  ),
  0,
  'a listing only the pruned scope produced is deleted'
);

select is(
  (
    select pipeline_scope_keys
    from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-shared'
  ),
  array['new'],
  'a listing another scope also produces only loses the pruned key'
);

select is(
  (
    select pipeline_scope_keys
    from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-in-use'
  ),
  array['old'],
  'a listing a workspace uses is kept with its key'
);

select is(
  (
    select pipeline_scope_keys
    from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-other-drive'
  ),
  array['old'],
  'a listing on another drive is untouched'
);

select is(
  (
    select count(*)::integer
    from public.pipeline_scope_checkpoints
    where pipeline_name = 'pgtap-fixture-pipeline'
  ),
  2,
  'only the pruned drive and scope lose their checkpoint'
);

-- ---------------------------------------------------------------------------
-- Pruning every drive at once
-- ---------------------------------------------------------------------------

select results_eq(
  $$select * from public.rpc_data_catalog_listings__prune_pipeline_scope(
      'pgtap-fixture-pipeline', 'old', null, false)$$,
  $$values (1, 1, 0, 1)$$,
  'a null drive prunes the scope on every drive'
);

-- ---------------------------------------------------------------------------
-- Only the service role may call either function
-- ---------------------------------------------------------------------------

select ok(
  has_function_privilege(
    'service_role',
    'public.rpc_data_catalog_listings__prune_pipeline_scope(text, text, text, boolean)',
    'execute'
  ),
  'the service role may prune a scope'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.rpc_data_catalog_listings__prune_pipeline_scope(text, text, text, boolean)',
    'execute'
  ),
  'a signed-in user may not prune a scope'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_data_catalog_listings__prune_pipeline_scope(text, text, text, boolean)',
    'execute'
  ),
  'an anonymous visitor may not prune a scope'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.rpc_data_catalog_listings__list_pipeline_scopes(text)',
    'execute'
  ),
  'a signed-in user may not list a pipeline''s scopes'
);

select * from finish();

rollback;
