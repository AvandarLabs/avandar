\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

select plan(3);

select has_table('public'::name, 'role_group_app_roles'::name);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.role_group_app_roles'::regclass
  ),
  'RLS enabled on role_group_app_roles'
);

select index_is_unique(
  'public',
  'role_group_app_roles',
  'role_group_app_roles__role_group_id_app'::name
);

select * from finish();

rollback;
