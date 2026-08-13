\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- Fixtures. Prefix a1 keeps these distinct within this file.
insert into auth.users (id, email, aud, role)
values
  ('a1000001-0000-4000-8000-000000000001'::uuid, 'a1_owner@test.dev', 'authenticated', 'authenticated'),
  ('a1000002-0000-4000-8000-000000000002'::uuid, 'a1_other@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a1001001-0000-4000-8000-000000000001'::uuid,
  'a1000001-0000-4000-8000-000000000001'::uuid,
  'a1 workspace',
  'a1-non-owner-share-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('a1002001-0000-4000-8000-000000000001'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid),
  ('a1002002-0000-4000-8000-000000000002'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1000002-0000-4000-8000-000000000002'::uuid);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('a1003001-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1002001-0000-4000-8000-000000000001'::uuid, 'A1 Owner', 'A1 Owner'),
  ('a1003002-0000-4000-8000-000000000002'::uuid, 'a1000002-0000-4000-8000-000000000002'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1002002-0000-4000-8000-000000000002'::uuid, 'A1 Other', 'A1 Other');

insert into public.user_groups (id, workspace_id, name, color)
values ('a1004001-0000-4000-8000-000000000001'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1 group', '#000000');

-- Five dashboards, one per share shape under test.
insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted)
values
  ('a1005001-0000-4000-8000-000000000001'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid, 'a1003001-0000-4000-8000-000000000001'::uuid, 'no shares', '{}'::jsonb, true),
  ('a1005002-0000-4000-8000-000000000002'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid, 'a1003001-0000-4000-8000-000000000001'::uuid, 'user share to other', '{}'::jsonb, true),
  ('a1005003-0000-4000-8000-000000000003'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid, 'a1003001-0000-4000-8000-000000000001'::uuid, 'user share to owner', '{}'::jsonb, true),
  ('a1005004-0000-4000-8000-000000000004'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid, 'a1003001-0000-4000-8000-000000000001'::uuid, 'workspace share', '{}'::jsonb, true),
  ('a1005005-0000-4000-8000-000000000005'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid, 'a1003001-0000-4000-8000-000000000001'::uuid, 'group share', '{}'::jsonb, true);

insert into public.resource_shares (id, workspace_id, resource_type, resource_id, principal_type, principal_id, role)
values
  ('a1006002-0000-4000-8000-000000000002'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'a1005002-0000-4000-8000-000000000002'::uuid, 'user', 'a1000002-0000-4000-8000-000000000002'::uuid, 'viewer'),
  ('a1006003-0000-4000-8000-000000000003'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'a1005003-0000-4000-8000-000000000003'::uuid, 'user', 'a1000001-0000-4000-8000-000000000001'::uuid, 'viewer'),
  ('a1006004-0000-4000-8000-000000000004'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'a1005004-0000-4000-8000-000000000004'::uuid, 'workspace', null, 'viewer'),
  ('a1006005-0000-4000-8000-000000000005'::uuid, 'a1001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'a1005005-0000-4000-8000-000000000005'::uuid, 'user_group', 'a1004001-0000-4000-8000-000000000001'::uuid, 'viewer');

select plan(5);

select is(
  public.util__has_non_owner_share (
    'dashboard'::public.resource_type,
    'a1005001-0000-4000-8000-000000000001'::uuid,
    'a1000001-0000-4000-8000-000000000001'::uuid
  ),
  false,
  'no shares at all: no non-owner share'
);

select is(
  public.util__has_non_owner_share (
    'dashboard'::public.resource_type,
    'a1005002-0000-4000-8000-000000000002'::uuid,
    'a1000001-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'user share to someone else counts'
);

select is(
  public.util__has_non_owner_share (
    'dashboard'::public.resource_type,
    'a1005003-0000-4000-8000-000000000003'::uuid,
    'a1000001-0000-4000-8000-000000000001'::uuid
  ),
  false,
  'user share whose principal IS the owner does not count'
);

select is(
  public.util__has_non_owner_share (
    'dashboard'::public.resource_type,
    'a1005004-0000-4000-8000-000000000004'::uuid,
    'a1000001-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'workspace share counts even though principal_id is null'
);

select is(
  public.util__has_non_owner_share (
    'dashboard'::public.resource_type,
    'a1005005-0000-4000-8000-000000000005'::uuid,
    'a1000001-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'user_group share counts'
);

select * from finish();

rollback;
