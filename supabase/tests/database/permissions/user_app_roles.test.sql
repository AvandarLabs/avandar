\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  (
    'e1000001-0000-4000-8000-000000000001'::uuid,
    'uar_owner@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'e1000002-0000-4000-8000-000000000002'::uuid,
    'uar_member@test.dev',
    'authenticated',
    'authenticated'
  )
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values (
  'e2000001-0000-4000-8000-000000000001'::uuid,
  'e1000001-0000-4000-8000-000000000001'::uuid,
  'uar workspace',
  'uar-ws-test'
)
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  (
    'e3000001-0000-4000-8000-000000000001'::uuid,
    'e2000001-0000-4000-8000-000000000001'::uuid,
    'e1000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'e3000002-0000-4000-8000-000000000002'::uuid,
    'e2000001-0000-4000-8000-000000000001'::uuid,
    'e1000002-0000-4000-8000-000000000002'::uuid
  )
on conflict (id) do nothing;

insert into public.user_profiles (
  id,
  user_id,
  workspace_id,
  membership_id,
  full_name,
  display_name
)
values
  (
    'e4000001-0000-4000-8000-000000000001'::uuid,
    'e1000001-0000-4000-8000-000000000001'::uuid,
    'e2000001-0000-4000-8000-000000000001'::uuid,
    'e3000001-0000-4000-8000-000000000001'::uuid,
    'Owner',
    'Owner'
  ),
  (
    'e4000002-0000-4000-8000-000000000002'::uuid,
    'e1000002-0000-4000-8000-000000000002'::uuid,
    'e2000001-0000-4000-8000-000000000001'::uuid,
    'e3000002-0000-4000-8000-000000000002'::uuid,
    'Member',
    'Member'
  )
on conflict (id) do nothing;

select plan(7);

select has_table('public'::name, 'user_app_roles'::name);

select has_column(
  'user_app_roles'::name,
  'workspace_id'::name
);

select has_column(
  'user_app_roles'::name,
  'app'::name
);

select has_column(
  'user_app_roles'::name,
  'role'::name
);

select index_is_unique(
  'public',
  'user_app_roles',
  'user_app_roles__workspace_user_app'::name
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.user_app_roles'::regclass
  ),
  'RLS enabled on user_app_roles'
);

select throws_ok(
  $q$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e1000002-0000-4000-8000-000000000002"}',
    true
  );
  insert into public.user_app_roles (
    workspace_id,
    user_id,
    app,
    role
  )
  values (
    'e2000001-0000-4000-8000-000000000001'::uuid,
    'e1000002-0000-4000-8000-000000000002'::uuid,
    'dashboards'::public.app_type,
    'viewer'::public.role_level
  );
  $q$,
  '42501',
  'new row violates row-level security policy for table "user_app_roles"'
);

select * from finish();

rollback;
