\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

select plan(5);

select has_table('public'::name, 'resource_shares'::name);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.resource_shares'::regclass
  ),
  'RLS enabled on resource_shares'
);

select ok(
  (
    select count(*) = 1
    from pg_indexes
    where
      indexname = 'resource_shares__uniq_workspace_principal'
  ),
  'partial unique index for workspace principal exists'
);

select ok(
  (
    select count(*) = 1
    from pg_indexes
    where
      indexname = 'resource_shares__uniq_user_principal'
  ),
  'partial unique index for user principal exists'
);

select ok(
  (
    select count(*) = 1
    from pg_indexes
    where
      indexname = 'resource_shares__uniq_user_group_principal'
  ),
  'partial unique index for user_group principal exists'
);

select * from finish();

rollback;
