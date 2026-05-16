\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

select plan(3);

select has_table('public'::name, 'resource_user_group_tags'::name);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.resource_user_group_tags'::regclass
  ),
  'RLS enabled on resource_user_group_tags'
);

select ok(
  (
    select count(*) = 1
    from information_schema.table_constraints
    where
      constraint_name = 'resource_user_group_tags_user_group_id_fkey' and
      table_name = 'resource_user_group_tags'
  ),
  'resource_user_group_tags has FK to user_groups'
);

select * from finish();

rollback;
