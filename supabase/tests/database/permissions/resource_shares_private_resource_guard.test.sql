\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a5000001-0000-4000-8000-000000000001'::uuid, 'a5_owner@test.dev', 'authenticated', 'authenticated'),
  ('a5000002-0000-4000-8000-000000000002'::uuid, 'a5_admin@test.dev', 'authenticated', 'authenticated'),
  ('a5000003-0000-4000-8000-000000000003'::uuid, 'a5_third@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a5001001-0000-4000-8000-000000000001'::uuid,
  'a5000001-0000-4000-8000-000000000001'::uuid,
  'a5 workspace',
  'a5-shares-guard-ws'
);

insert into public.role_groups (id, workspace_id, name, is_builtin)
values ('a500cf01-0000-4000-8000-000000000001'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5 admin group', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('a500cf01-0000-4000-8000-000000000001'::uuid, 'settings'::public.app_type, 'admin'::public.role_level),
  ('a500cf01-0000-4000-8000-000000000001'::uuid, 'dashboards'::public.app_type, 'admin'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('a5002001-0000-4000-8000-000000000001'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5000001-0000-4000-8000-000000000001'::uuid, null),
  ('a5002002-0000-4000-8000-000000000002'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5000002-0000-4000-8000-000000000002'::uuid, 'a500cf01-0000-4000-8000-000000000001'::uuid),
  ('a5002003-0000-4000-8000-000000000003'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5000003-0000-4000-8000-000000000003'::uuid, null);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('a5003001-0000-4000-8000-000000000001'::uuid, 'a5000001-0000-4000-8000-000000000001'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5002001-0000-4000-8000-000000000001'::uuid, 'A5 Owner', 'A5 Owner'),
  ('a5003002-0000-4000-8000-000000000002'::uuid, 'a5000002-0000-4000-8000-000000000002'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5002002-0000-4000-8000-000000000002'::uuid, 'A5 Admin', 'A5 Admin'),
  ('a5003003-0000-4000-8000-000000000003'::uuid, 'a5000003-0000-4000-8000-000000000003'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5002003-0000-4000-8000-000000000003'::uuid, 'A5 Third', 'A5 Third');

-- d_private is private to a5000001. d_open is unrestricted.
insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted, is_public)
values
  ('a5005001-0000-4000-8000-000000000001'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5000001-0000-4000-8000-000000000001'::uuid, 'a5003001-0000-4000-8000-000000000001'::uuid, 'private', '{}'::jsonb, true, false),
  ('a5005002-0000-4000-8000-000000000002'::uuid, 'a5001001-0000-4000-8000-000000000001'::uuid, 'a5000001-0000-4000-8000-000000000001'::uuid, 'a5003001-0000-4000-8000-000000000001'::uuid, 'open', '{}'::jsonb, false, false);

-- An existing share on the open dashboard, for the UPDATE-repoint test.
insert into public.resource_shares (id, workspace_id, resource_type, resource_id, principal_type, principal_id, role)
values (
  'a5006002-0000-4000-8000-000000000002'::uuid,
  'a5001001-0000-4000-8000-000000000001'::uuid,
  'dashboard',
  'a5005002-0000-4000-8000-000000000002'::uuid,
  'user',
  'a5000003-0000-4000-8000-000000000003'::uuid,
  'viewer'
);

select plan(4);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a5000002-0000-4000-8000-000000000002"}',
  true
);

-- The bypass: self-grant on a private resource must be refused.
select throws_ok(
  $$insert into public.resource_shares (
      workspace_id, resource_type, resource_id, principal_type, principal_id, role
    ) values (
      'a5001001-0000-4000-8000-000000000001'::uuid,
      'dashboard',
      'a5005001-0000-4000-8000-000000000001'::uuid,
      'user',
      'a5000002-0000-4000-8000-000000000002'::uuid,
      'admin'
    )$$,
  '42501',
  'new row violates row-level security policy for table "resource_shares"',
  'settings admin cannot self-grant a share on a private resource'
);

-- The same bypass via UPDATE: repoint an existing share at the private resource.
select throws_ok(
  $$update public.resource_shares
       set resource_id = 'a5005001-0000-4000-8000-000000000001'::uuid
     where id = 'a5006002-0000-4000-8000-000000000002'::uuid$$,
  '42501',
  'new row violates row-level security policy for table "resource_shares"',
  'settings admin cannot repoint a share onto a private resource'
);

-- Legitimate admin sharing must keep working.
--
-- Note on what this assertion does and does NOT prove. It cannot isolate the
-- policy's `is_settings_admin and not is_private` disjunct, because for any
-- resource that actually exists and is not private, the OTHER disjunct
-- (util__auth_user_can_access_resource(..., 'admin')) is already true for a
-- settings admin: util__resource_effective_role short-circuits to 'admin' for
-- them. Stripping the admin's dashboards app role does not change that.
-- So this assertion is a regression test for "legitimate sharing still works",
-- not proof of the gated disjunct. Assertions 1 and 2 are what prove the
-- escalation is closed; both were confirmed to fail against the pre-fix policy.
select lives_ok(
  $$insert into public.resource_shares (
      workspace_id, resource_type, resource_id, principal_type, principal_id, role
    ) values (
      'a5001001-0000-4000-8000-000000000001'::uuid,
      'dashboard',
      'a5005002-0000-4000-8000-000000000002'::uuid,
      'user',
      'a5000002-0000-4000-8000-000000000002'::uuid,
      'viewer'
    )$$,
  'settings admin can still share a non-private resource'
);

-- The owner can share their own private resource; that is how it stops
-- being private.
set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a5000001-0000-4000-8000-000000000001"}',
  true
);

select lives_ok(
  $$insert into public.resource_shares (
      workspace_id, resource_type, resource_id, principal_type, principal_id, role
    ) values (
      'a5001001-0000-4000-8000-000000000001'::uuid,
      'dashboard',
      'a5005001-0000-4000-8000-000000000001'::uuid,
      'user',
      'a5000003-0000-4000-8000-000000000003'::uuid,
      'viewer'
    )$$,
  'the owner can share their own private resource'
);

select * from finish();

rollback;
