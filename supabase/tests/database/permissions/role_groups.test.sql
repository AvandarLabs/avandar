\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

select plan(4);

select has_table('public'::name, 'role_groups'::name);

select has_column('role_groups'::name, 'is_builtin'::name);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.role_groups'::regclass
  ),
  'RLS enabled on role_groups'
);

select index_is_unique(
  'public',
  'role_groups',
  'role_groups__workspace_id_name'::name
);

select * from finish();

rollback;
