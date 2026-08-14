\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- Regression lock for the P1 private-resource narrowing.
--
-- Narrowing the Settings-Admin short-circuit in util__resource_effective_role
-- is only sufficient because both may_select_* helpers gate on
-- util__auth_user_can_access_resource BEFORE their own
-- util__can_manage_workspace_settings bypass. If that statement order ever
-- changes, admins regain read access to private resources and nothing else in
-- the suite would notice. Hence this file.
--
-- See docs/superpowers/specs/2026-08-13-private-resource-permissions-hardening-design.md

-- owner = a4000001, settings admin = a4000002
insert into auth.users (id, email, aud, role)
values
  ('a4000001-0000-4000-8000-000000000001'::uuid, 'a4_owner@test.dev', 'authenticated', 'authenticated'),
  ('a4000002-0000-4000-8000-000000000002'::uuid, 'a4_admin@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a4001001-0000-4000-8000-000000000001'::uuid,
  'a4000001-0000-4000-8000-000000000001'::uuid,
  'a4 workspace',
  'a4-may-select-ws'
);

insert into public.role_groups (id, workspace_id, name, is_builtin)
values ('a400cf01-0000-4000-8000-000000000001'::uuid, 'a4001001-0000-4000-8000-000000000001'::uuid, 'a4 admin group', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('a400cf01-0000-4000-8000-000000000001'::uuid, 'settings'::public.app_type, 'admin'::public.role_level),
  ('a400cf01-0000-4000-8000-000000000001'::uuid, 'dashboards'::public.app_type, 'admin'::public.role_level),
  ('a400cf01-0000-4000-8000-000000000001'::uuid, 'data_sources'::public.app_type, 'admin'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('a4002001-0000-4000-8000-000000000001'::uuid, 'a4001001-0000-4000-8000-000000000001'::uuid, 'a4000001-0000-4000-8000-000000000001'::uuid, null),
  ('a4002002-0000-4000-8000-000000000002'::uuid, 'a4001001-0000-4000-8000-000000000001'::uuid, 'a4000002-0000-4000-8000-000000000002'::uuid, 'a400cf01-0000-4000-8000-000000000001'::uuid);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('a4003001-0000-4000-8000-000000000001'::uuid, 'a4000001-0000-4000-8000-000000000001'::uuid, 'a4001001-0000-4000-8000-000000000001'::uuid, 'a4002001-0000-4000-8000-000000000001'::uuid, 'A4 Owner', 'A4 Owner'),
  ('a4003002-0000-4000-8000-000000000002'::uuid, 'a4000002-0000-4000-8000-000000000002'::uuid, 'a4001001-0000-4000-8000-000000000001'::uuid, 'a4002002-0000-4000-8000-000000000002'::uuid, 'A4 Admin', 'A4 Admin');

insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted, is_public)
values
  ('a4005001-0000-4000-8000-000000000001'::uuid, 'a4001001-0000-4000-8000-000000000001'::uuid, 'a4000001-0000-4000-8000-000000000001'::uuid, 'a4003001-0000-4000-8000-000000000001'::uuid, 'private', '{}'::jsonb, true, false),
  ('a4005002-0000-4000-8000-000000000002'::uuid, 'a4001001-0000-4000-8000-000000000001'::uuid, 'a4000001-0000-4000-8000-000000000001'::uuid, 'a4003001-0000-4000-8000-000000000001'::uuid, 'unrestricted', '{}'::jsonb, false, false);

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type, is_restricted)
values (
  'a4007001-0000-4000-8000-000000000001'::uuid,
  'a4001001-0000-4000-8000-000000000001'::uuid,
  'a4000001-0000-4000-8000-000000000001'::uuid,
  'a4003001-0000-4000-8000-000000000001'::uuid,
  'private ds',
  'virtual'::public.datasets__source_type,
  true
);

select plan(5);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a4000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__auth_user_may_select_dashboard ('a4005001-0000-4000-8000-000000000001'::uuid),
  false,
  'settings admin may not select a dashboard private to its owner'
);

select is(
  public.util__auth_user_may_select_dataset ('a4007001-0000-4000-8000-000000000001'::uuid),
  false,
  'settings admin may not select a dataset private to its owner'
);

select is(
  public.util__auth_user_may_select_dashboard ('a4005002-0000-4000-8000-000000000002'::uuid),
  true,
  'settings admin may still select an unrestricted dashboard'
);

-- RLS-level proof, not just the helper: the row must be invisible in a select.
select is(
  (
    select count(*)::int
    from public.dashboards
    where id = 'a4005001-0000-4000-8000-000000000001'::uuid
  ),
  0,
  'RLS hides the private dashboard row from the settings admin'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a4000001-0000-4000-8000-000000000001"}',
  true
);

select is(
  public.util__auth_user_may_select_dashboard ('a4005001-0000-4000-8000-000000000001'::uuid),
  true,
  'the owner may still select their own private dashboard'
);

select * from finish();

rollback;
