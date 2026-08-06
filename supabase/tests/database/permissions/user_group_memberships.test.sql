\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

select plan(4);

select has_table('public'::name, 'user_group_memberships'::name);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.user_group_memberships'::regclass
  ),
  'RLS enabled on user_group_memberships'
);

select index_is_unique(
  'public',
  'user_group_memberships',
  'user_group_memberships__group_user'::name
);

select has_trigger(
  'public'::name,
  'workspace_memberships'::name,
  'tr_workspace_memberships__cleanup_user_group_memberships'::name
);

select * from finish();

rollback;
