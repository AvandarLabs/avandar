\set ON_ERROR_STOP on

-- Identifiers are `pgtap-fixture`-prefixed and hosts are `.invalid`, so no
-- fixture can collide with a row a real pipeline wrote to this database.

begin;

select plan(11);

-- ---------------------------------------------------------------------------
-- The checkpoints table: one row per pipeline, drive, and scope, reachable by
-- the service role only.
-- ---------------------------------------------------------------------------

select has_table(
  'public',
  'pipeline_scope_checkpoints',
  'the checkpoints table exists'
);

select col_is_pk(
  'public',
  'pipeline_scope_checkpoints',
  array['pipeline_name', 'drive_key', 'scope_key'],
  'a checkpoint is keyed by pipeline, drive, and scope'
);

select table_privs_are(
  'public',
  'pipeline_scope_checkpoints',
  'service_role',
  array['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'the service role reads and writes checkpoints, and nothing more'
);

select table_privs_are(
  'public',
  'pipeline_scope_checkpoints',
  'authenticated',
  array[]::text[],
  'a signed-in user has no access to checkpoints'
);

select table_privs_are(
  'public',
  'pipeline_scope_checkpoints',
  'anon',
  array[]::text[],
  'an anonymous visitor has no access to checkpoints'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.pipeline_scope_checkpoints'::regclass
  ),
  'row level security is enabled on checkpoints'
);

select policies_are(
  'public',
  'pipeline_scope_checkpoints',
  array[]::name[],
  'checkpoints have no policies, so only the service role reaches them'
);

select trigger_is(
  'public',
  'pipeline_scope_checkpoints',
  'tr__pipeline_scope_checkpoints__set_updated_at',
  'public',
  'util__set_updated_at',
  'updated_at is maintained on every update'
);

-- ---------------------------------------------------------------------------
-- Listings record the scopes that produce them. A row written without any
-- has none, and the column never holds null.
-- ---------------------------------------------------------------------------

insert into public.data_catalog_listings
  (display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format)
values
  ('pgtap-fixture scope keys', 'Fixture Org', 'api_resource', 'ckan',
   'https://pgtap-fixture.invalid', 'pgtap-fixture-scope-keys',
   'pgtap-fixture-scope-keys-resource', 'CSV');

select is(
  (
    select pipeline_scope_keys
    from public.data_catalog_listings
    where external_dataset_id = 'pgtap-fixture-scope-keys'
  ),
  '{}'::text[],
  'a listing written without scope keys has none'
);

select throws_ok(
  $$update public.data_catalog_listings
    set pipeline_scope_keys = null
    where external_dataset_id = 'pgtap-fixture-scope-keys'$$,
  '23502',
  null,
  'pipeline_scope_keys cannot be null'
);

select has_index(
  'public',
  'data_catalog_listings',
  'data_catalog_listings__pipeline_drive_last_update',
  array['pipeline_name', 'api_base_url', 'date_of_last_update'],
  'listings keep their pipeline and drive index'
);

select * from finish();

rollback;
