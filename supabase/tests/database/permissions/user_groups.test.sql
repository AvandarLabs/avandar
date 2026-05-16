\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

select plan(3);

select has_table('public'::name, 'user_groups'::name);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.user_groups'::regclass
  ),
  'RLS enabled on user_groups'
);

select index_is_unique(
  'public',
  'user_groups',
  'user_groups__workspace_id_name'::name
);

select * from finish();

rollback;
