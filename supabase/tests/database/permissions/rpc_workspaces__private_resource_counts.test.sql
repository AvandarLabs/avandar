\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a7000001-0000-4000-8000-000000000001'::uuid, 'a7_owner@test.dev', 'authenticated', 'authenticated'),
  ('a7000002-0000-4000-8000-000000000002'::uuid, 'a7_admin@test.dev', 'authenticated', 'authenticated'),
  ('a7000003-0000-4000-8000-000000000003'::uuid, 'a7_plain@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a7001001-0000-4000-8000-000000000001'::uuid,
  'a7000001-0000-4000-8000-000000000001'::uuid,
  'a7 workspace',
  'a7-counts-ws'
);

insert into public.role_groups (id, workspace_id, name, is_builtin)
values ('a700cf01-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7 admin group', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values ('a700cf01-0000-4000-8000-000000000001'::uuid, 'settings'::public.app_type, 'admin'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('a7002001-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, null),
  ('a7002002-0000-4000-8000-000000000002'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000002-0000-4000-8000-000000000002'::uuid, 'a700cf01-0000-4000-8000-000000000001'::uuid),
  ('a7002003-0000-4000-8000-000000000003'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000003-0000-4000-8000-000000000003'::uuid, null);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('a7003001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7002001-0000-4000-8000-000000000001'::uuid, 'A7 Owner', 'A7 Owner'),
  ('a7003002-0000-4000-8000-000000000002'::uuid, 'a7000002-0000-4000-8000-000000000002'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7002002-0000-4000-8000-000000000002'::uuid, 'A7 Admin', 'A7 Admin'),
  ('a7003003-0000-4000-8000-000000000003'::uuid, 'a7000003-0000-4000-8000-000000000003'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7002003-0000-4000-8000-000000000003'::uuid, 'A7 Plain', 'A7 Plain');

-- a7000001 owns: 2 private dashboards, 1 public+restricted (must NOT count),
-- 1 unrestricted (must not count), and 1 private dataset.
insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted, is_public)
values
  ('a7005001-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'a7003001-0000-4000-8000-000000000001'::uuid, 'p1', '{}'::jsonb, true, false),
  ('a7005002-0000-4000-8000-000000000002'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'a7003001-0000-4000-8000-000000000001'::uuid, 'p2', '{}'::jsonb, true, false),
  ('a7005003-0000-4000-8000-000000000003'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'a7003001-0000-4000-8000-000000000001'::uuid, 'public restricted', '{}'::jsonb, true, true),
  ('a7005004-0000-4000-8000-000000000004'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'a7003001-0000-4000-8000-000000000001'::uuid, 'open', '{}'::jsonb, false, false);

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type, is_restricted)
values (
  'a7007001-0000-4000-8000-000000000001'::uuid,
  'a7001001-0000-4000-8000-000000000001'::uuid,
  'a7000001-0000-4000-8000-000000000001'::uuid,
  'a7003001-0000-4000-8000-000000000001'::uuid,
  'private ds',
  'virtual'::public.datasets__source_type,
  true
);

insert into public.maps (id, workspace_id, owner_id, owner_profile_id, name, config, is_public, is_restricted)
values (
  'a7009001-0000-4000-8000-000000000001'::uuid,
  'a7001001-0000-4000-8000-000000000001'::uuid,
  'a7000001-0000-4000-8000-000000000001'::uuid,
  'a7003001-0000-4000-8000-000000000001'::uuid,
  'private map',
  '{}'::jsonb,
  true,
  true
);

select plan(6);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a7000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  (
    select private_dashboard_count
    from public.rpc_workspaces__private_resource_counts ('a7001001-0000-4000-8000-000000000001'::uuid)
    where user_id = 'a7000001-0000-4000-8000-000000000001'::uuid
  ),
  2::bigint,
  'counts the two private dashboards and excludes public + unrestricted'
);

select is(
  (
    select private_dataset_count
    from public.rpc_workspaces__private_resource_counts ('a7001001-0000-4000-8000-000000000001'::uuid)
    where user_id = 'a7000001-0000-4000-8000-000000000001'::uuid
  ),
  1::bigint,
  'counts the one private dataset'
);

select is(
  (
    select private_map_count
    from public.rpc_workspaces__private_resource_counts ('a7001001-0000-4000-8000-000000000001'::uuid)
    where user_id = 'a7000001-0000-4000-8000-000000000001'::uuid
  ),
  1::bigint,
  'counts a restricted map even when its inert public flag is true'
);

select is(
  (
    select private_dashboard_count
    from public.rpc_workspaces__private_resource_counts ('a7001001-0000-4000-8000-000000000001'::uuid)
    where user_id = 'a7000003-0000-4000-8000-000000000003'::uuid
  ),
  0::bigint,
  'members with nothing private appear with zero'
);

select is(
  (
    select count(*)::int
    from public.rpc_workspaces__private_resource_counts ('a7001001-0000-4000-8000-000000000001'::uuid)
  ),
  3,
  'one row per workspace member'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a7000003-0000-4000-8000-000000000003"}',
  true
);

select throws_ok(
  $$select * from public.rpc_workspaces__private_resource_counts (
      'a7001001-0000-4000-8000-000000000001'::uuid
    )$$,
  '42501',
  'insufficient_privilege',
  'a plain member cannot read private-resource counts'
);

select * from finish();

rollback;
