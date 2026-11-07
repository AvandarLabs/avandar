\set ON_ERROR_STOP on

-- The drives table, the listing columns the catalog field mapping adds, and
-- who can read and write them. Identifiers are `pgtap-fixture`-prefixed and
-- hosts are `.invalid`.

begin;

set search_path to extensions, public;

select plan(16);

select has_table('public', 'data_catalog_drives', 'the drives table exists');

select col_not_null('public', 'data_catalog_drives', 'pipeline_name', 'a drive names its pipeline');
select col_not_null('public', 'data_catalog_drives', 'drive_key', 'a drive has a key');
select has_column('public', 'data_catalog_drives', 'organization4_label', 'a drive labels up to four levels');

select has_column('public', 'data_catalog_listings', 'organization1_name', 'level 1 is organization1_name');
select hasnt_column('public', 'data_catalog_listings', 'external_organization_name', 'the old name is gone');
select col_not_null('public', 'data_catalog_listings', 'organization1_name', 'level 1 is required');
select col_type_is('public', 'data_catalog_listings', 'domains', 'text[]', 'domains is a text array');
select col_type_is('public', 'data_catalog_listings', 'tags', 'text[]', 'tags is a text array');
select col_type_is('public', 'data_catalog_listings', 'source_metadata', 'jsonb', 'source_metadata is jsonb');
select fk_ok('public', 'data_catalog_listings', 'drive_id', 'public', 'data_catalog_drives', 'id', 'a listing points at its drive');

insert into public.data_catalog_drives (pipeline_name, drive_key, organization1_label)
values ('pgtap-fixture', 'https://pgtap-fixture.invalid', 'City');

select throws_ok(
  $$insert into public.data_catalog_drives (pipeline_name, drive_key)
    values ('pgtap-fixture', 'https://pgtap-fixture.invalid')$$,
  '23505',
  null,
  'a pipeline lists a drive once'
);

set local role authenticated;

select results_eq(
  $$select organization1_label from public.data_catalog_drives
    where pipeline_name = 'pgtap-fixture'$$,
  $$values ('City'::text)$$,
  'a signed-in user can read drives'
);

select throws_ok(
  $$insert into public.data_catalog_drives (pipeline_name, drive_key)
    values ('pgtap-fixture', 'https://other.pgtap-fixture.invalid')$$,
  '42501',
  null,
  'a signed-in user cannot add drives'
);

select throws_ok(
  $$update public.data_catalog_drives set organization1_label = 'Town'
    where pipeline_name = 'pgtap-fixture'$$,
  '42501',
  null,
  'a signed-in user cannot change drives'
);

select throws_ok(
  $$delete from public.data_catalog_drives
    where pipeline_name = 'pgtap-fixture'$$,
  '42501',
  null,
  'a signed-in user cannot delete drives'
);

select * from finish();

rollback;
