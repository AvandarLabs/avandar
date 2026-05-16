\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

select plan(8);

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

set local role postgres;

insert into auth.users (id, email, aud, role)
values (
  'ee000001-0000-4000-8000-000000000001'::uuid,
  'rg_reserved@test.dev',
  'authenticated',
  'authenticated'
)
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values (
  'ee100001-0000-4000-8000-000000000001'::uuid,
  'ee000001-0000-4000-8000-000000000001'::uuid,
  'rg reserved name test ws',
  'rg-reserved-name-test-ws'
)
on conflict (id) do nothing;

select throws_ok(
  $rg_bad$
  insert into public.role_groups (workspace_id, name, is_builtin)
  values (
    'ee100001-0000-4000-8000-000000000001'::uuid,
    'GLOBAL ADMIN',
    false
  );
  $rg_bad$,
  '23514'
);

select throws_ok(
  $rg_bad2$
  insert into public.role_groups (workspace_id, name, is_builtin)
  values (
    'ee100001-0000-4000-8000-000000000001'::uuid,
    'global editor',
    false
  );
  $rg_bad2$,
  '23514'
);

select throws_ok(
  $rg_bad3$
  insert into public.role_groups (workspace_id, name, is_builtin)
  values (
    'ee100001-0000-4000-8000-000000000001'::uuid,
    '  GlObAl ViEwEr  ',
    false
  );
  $rg_bad3$,
  '23514'
);

select lives_ok(
  $rg_ok$
  insert into public.role_groups (workspace_id, name, is_builtin)
  values (
    'ee100001-0000-4000-8000-000000000001'::uuid,
    'Analyst Custom',
    false
  );
  $rg_ok$
);

select * from finish();

rollback;
