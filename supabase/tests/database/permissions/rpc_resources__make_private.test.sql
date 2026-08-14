\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- Fixtures. Prefix b1 keeps these distinct within this file.
insert into auth.users (id, email, aud, role)
values
  ('b1000001-0000-4000-8000-000000000001'::uuid, 'b1_owner@test.dev', 'authenticated', 'authenticated'),
  ('b1000002-0000-4000-8000-000000000002'::uuid, 'b1_admin@test.dev', 'authenticated', 'authenticated'),
  ('b1000003-0000-4000-8000-000000000003'::uuid, 'b1_member@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'b1001001-0000-4000-8000-000000000001'::uuid,
  'b1000002-0000-4000-8000-000000000002'::uuid,
  'b1 workspace',
  'b1-make-private-ws'
);

-- b1000002 is a Settings Admin. This is the J1 case most likely to regress,
-- because the resource_shares DELETE policy would otherwise admit them.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values ('b100cf01-0000-4000-8000-000000000001'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1 admin group', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values ('b100cf01-0000-4000-8000-000000000001'::uuid, 'settings'::public.app_type, 'admin'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('b1002001-0000-4000-8000-000000000001'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1000001-0000-4000-8000-000000000001'::uuid, null),
  ('b1002002-0000-4000-8000-000000000002'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1000002-0000-4000-8000-000000000002'::uuid, 'b100cf01-0000-4000-8000-000000000001'::uuid),
  ('b1002003-0000-4000-8000-000000000003'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1000003-0000-4000-8000-000000000003'::uuid, null);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('b1003001-0000-4000-8000-000000000001'::uuid, 'b1000001-0000-4000-8000-000000000001'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1002001-0000-4000-8000-000000000001'::uuid, 'B1 Owner', 'B1 Owner'),
  ('b1003002-0000-4000-8000-000000000002'::uuid, 'b1000002-0000-4000-8000-000000000002'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1002002-0000-4000-8000-000000000002'::uuid, 'B1 Admin', 'B1 Admin'),
  ('b1003003-0000-4000-8000-000000000003'::uuid, 'b1000003-0000-4000-8000-000000000003'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1002003-0000-4000-8000-000000000003'::uuid, 'B1 Member', 'B1 Member');

insert into public.user_groups (id, workspace_id, name, color)
values ('b1004001-0000-4000-8000-000000000001'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1 group', '#000000');

-- d1: unrestricted, carrying every share shape at once.
-- d2: already private. Doubles as the "caller cannot see the row" fixture,
--     because a plain member cannot select a private dashboard at all.
-- d3: a bystander in the same workspace, sharing d1's owner and share shape.
--     Nothing under test ever names it, so it is only ever touched by a DELETE
--     whose predicate is too wide. It has to be a third dashboard rather than a
--     share on d2, which must stay genuinely private for the hidden-row case.
insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted)
values
  ('b1005001-0000-4000-8000-000000000001'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1000001-0000-4000-8000-000000000001'::uuid, 'b1003001-0000-4000-8000-000000000001'::uuid, 'b1 shared dashboard', '{}'::jsonb, false),
  ('b1005002-0000-4000-8000-000000000002'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1000001-0000-4000-8000-000000000001'::uuid, 'b1003001-0000-4000-8000-000000000001'::uuid, 'b1 already private', '{}'::jsonb, true),
  ('b1005003-0000-4000-8000-000000000003'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'b1000001-0000-4000-8000-000000000001'::uuid, 'b1003001-0000-4000-8000-000000000001'::uuid, 'b1 bystander dashboard', '{}'::jsonb, false);

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type, is_restricted)
values (
  'b1007001-0000-4000-8000-000000000001'::uuid,
  'b1001001-0000-4000-8000-000000000001'::uuid,
  'b1000001-0000-4000-8000-000000000001'::uuid,
  'b1003001-0000-4000-8000-000000000001'::uuid,
  'b1 shared dataset',
  'virtual'::public.datasets__source_type,
  false
);

-- Every share shape on d1: a user share to someone else, a group share, a
-- workspace share, and the owner's own user share, which must survive.
insert into public.resource_shares (id, workspace_id, resource_type, resource_id, principal_type, principal_id, role)
values
  ('b1006001-0000-4000-8000-000000000001'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'b1005001-0000-4000-8000-000000000001'::uuid, 'user', 'b1000003-0000-4000-8000-000000000003'::uuid, 'viewer'),
  ('b1006002-0000-4000-8000-000000000002'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'b1005001-0000-4000-8000-000000000001'::uuid, 'user_group', 'b1004001-0000-4000-8000-000000000001'::uuid, 'viewer'),
  ('b1006003-0000-4000-8000-000000000003'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'b1005001-0000-4000-8000-000000000001'::uuid, 'workspace', null, 'viewer'),
  ('b1006004-0000-4000-8000-000000000004'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'b1005001-0000-4000-8000-000000000001'::uuid, 'user', 'b1000001-0000-4000-8000-000000000001'::uuid, 'admin'),
  ('b1006005-0000-4000-8000-000000000005'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'dataset', 'b1007001-0000-4000-8000-000000000001'::uuid, 'user', 'b1000003-0000-4000-8000-000000000003'::uuid, 'viewer'),
  ('b1006006-0000-4000-8000-000000000006'::uuid, 'b1001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'b1005003-0000-4000-8000-000000000003'::uuid, 'user', 'b1000003-0000-4000-8000-000000000003'::uuid, 'viewer');

select plan(14);

-- === A Settings Admin who is not the owner must be refused. ===
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000002-0000-4000-8000-000000000002"}', true);

select throws_ok(
  $$select public.rpc_resources__make_private (
      'dashboard', 'b1005001-0000-4000-8000-000000000001'::uuid
    )$$,
  '42501',
  'insufficient_privilege',
  'a settings admin who is not the owner is refused'
);

set local role postgres;

select is(
  (select count(*)::int from public.resource_shares
    where resource_id = 'b1005001-0000-4000-8000-000000000001'::uuid),
  4,
  'the refused settings-admin call deleted nothing'
);

-- === A plain member must be refused. ===
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000003-0000-4000-8000-000000000003"}', true);

select throws_ok(
  $$select public.rpc_resources__make_private (
      'dashboard', 'b1005001-0000-4000-8000-000000000001'::uuid
    )$$,
  '42501',
  'insufficient_privilege',
  'a non-owner member is refused'
);

-- === Two indistinguishable failures, proving there is no existence oracle:
-- a row that exists but is hidden from this caller, and a row that does not
-- exist at all, must raise exactly the same error. ===
select throws_ok(
  $$select public.rpc_resources__make_private (
      'dashboard', 'b1005002-0000-4000-8000-000000000002'::uuid
    )$$,
  '42501',
  'insufficient_privilege',
  'a row the caller cannot see raises insufficient_privilege'
);

select throws_ok(
  $$select public.rpc_resources__make_private (
      'dashboard', 'b1005099-0000-4000-8000-000000000099'::uuid
    )$$,
  '42501',
  'insufficient_privilege',
  'a nonexistent id raises the identical error'
);

-- === The owner succeeds. ===
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000001-0000-4000-8000-000000000001"}', true);

select lives_ok(
  $$select public.rpc_resources__make_private (
      'dashboard', 'b1005001-0000-4000-8000-000000000001'::uuid
    )$$,
  'the owner can make their dashboard private'
);

set local role postgres;

select is(
  (select is_restricted from public.dashboards
    where id = 'b1005001-0000-4000-8000-000000000001'::uuid),
  true,
  'is_restricted is set'
);

select is(
  (select count(*)::int from public.resource_shares
    where resource_id = 'b1005001-0000-4000-8000-000000000001'::uuid),
  1,
  'user, group, and workspace shares are gone'
);

select is(
  (select principal_id from public.resource_shares
    where resource_id = 'b1005001-0000-4000-8000-000000000001'::uuid),
  'b1000001-0000-4000-8000-000000000001'::uuid,
  'the surviving share is the owner''s own, which does not defeat privacy'
);

select is(
  public.util__is_resource_private_to_owner (
    'dashboard', 'b1005001-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'the dashboard is now private to its owner'
);

-- The DELETE must be scoped to the named resource, not to the workspace. d3 is
-- never mentioned by any call above, so this fails only if the predicate is
-- too wide.
select is(
  (select count(*)::int from public.resource_shares
    where resource_id = 'b1005003-0000-4000-8000-000000000003'::uuid),
  1,
  'shares on a different resource in the same workspace are untouched'
);

-- === Datasets work the same way. ===
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000001-0000-4000-8000-000000000001"}', true);

select lives_ok(
  $$select public.rpc_resources__make_private (
      'dataset', 'b1007001-0000-4000-8000-000000000001'::uuid
    )$$,
  'datasets go private too'
);

set local role postgres;

select is(
  public.util__is_resource_private_to_owner (
    'dataset', 'b1007001-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'the dataset is now private to its owner'
);

-- === Idempotent on an already-private resource. ===
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000001-0000-4000-8000-000000000001"}', true);

select lives_ok(
  $$select public.rpc_resources__make_private (
      'dashboard', 'b1005002-0000-4000-8000-000000000002'::uuid
    )$$,
  'calling it on an already-private resource succeeds'
);

select * from finish();

rollback;
