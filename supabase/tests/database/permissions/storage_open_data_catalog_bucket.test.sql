\set ON_ERROR_STOP on

begin;

select plan(2);

select is(
  (select public from storage.buckets where id = 'open-data-catalog'),
  false,
  'The open-data-catalog bucket is private'
);

select results_eq(
  $$
    select count(*)::int from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (qual like '%open-data-catalog%' or with_check like '%open-data-catalog%')
  $$,
  $$ values (0) $$,
  'No storage policy references the open-data-catalog bucket - service-role only'
);

select * from finish();

rollback;
