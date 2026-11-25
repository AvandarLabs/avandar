\set ON_ERROR_STOP on

-- The `open-data-catalog` bucket held the open-data edge function's raw-bytes
-- cache, which is gone. A database built from migrations removes it.

begin;

select plan(2);

select is_empty(
  $$ select id from storage.buckets where id = 'open-data-catalog' $$,
  'The open-data-catalog bucket is removed'
);

select results_eq(
  $$
    select count(*)::int from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (qual like '%open-data-catalog%' or with_check like '%open-data-catalog%')
  $$,
  $$ values (0) $$,
  'No storage policy references the open-data-catalog bucket'
);

select * from finish();

rollback;
