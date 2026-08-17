\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a9000001-0000-4000-8000-000000000001'::uuid, 'a9_leaver@test.dev', 'authenticated', 'authenticated'),
  ('a9000002-0000-4000-8000-000000000002'::uuid, 'a9_admin@test.dev', 'authenticated', 'authenticated'),
  ('a9000003-0000-4000-8000-000000000003'::uuid, 'a9_target@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a9001001-0000-4000-8000-000000000001'::uuid,
  'a9000002-0000-4000-8000-000000000002'::uuid,
  'a9 workspace',
  'a9-bulk-transfer-ws'
);

insert into public.role_groups (id, workspace_id, name, is_builtin)
values ('a900cf01-0000-4000-8000-000000000001'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9 admin group', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values ('a900cf01-0000-4000-8000-000000000001'::uuid, 'settings'::public.app_type, 'admin'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('a9002001-0000-4000-8000-000000000001'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000001-0000-4000-8000-000000000001'::uuid, null),
  ('a9002002-0000-4000-8000-000000000002'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000002-0000-4000-8000-000000000002'::uuid, 'a900cf01-0000-4000-8000-000000000001'::uuid),
  ('a9002003-0000-4000-8000-000000000003'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000003-0000-4000-8000-000000000003'::uuid, null);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('a9003001-0000-4000-8000-000000000001'::uuid, 'a9000001-0000-4000-8000-000000000001'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9002001-0000-4000-8000-000000000001'::uuid, 'A9 Leaver', 'A9 Leaver'),
  ('a9003002-0000-4000-8000-000000000002'::uuid, 'a9000002-0000-4000-8000-000000000002'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9002002-0000-4000-8000-000000000002'::uuid, 'A9 Admin', 'A9 Admin'),
  ('a9003003-0000-4000-8000-000000000003'::uuid, 'a9000003-0000-4000-8000-000000000003'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9002003-0000-4000-8000-000000000003'::uuid, 'A9 Target', 'A9 Target');

-- The leaver owns two dashboards and one dataset.
insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted, visibility)
values
  ('a9005001-0000-4000-8000-000000000001'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000001-0000-4000-8000-000000000001'::uuid, 'a9003001-0000-4000-8000-000000000001'::uuid, 'p1', '{}'::jsonb, true, 'draft'),
  ('a9005002-0000-4000-8000-000000000002'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000001-0000-4000-8000-000000000001'::uuid, 'a9003001-0000-4000-8000-000000000001'::uuid, 'p2', '{}'::jsonb, false, 'draft');

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type, is_restricted)
values (
  'a9007001-0000-4000-8000-000000000001'::uuid,
  'a9001001-0000-4000-8000-000000000001'::uuid,
  'a9000001-0000-4000-8000-000000000001'::uuid,
  'a9003001-0000-4000-8000-000000000001'::uuid,
  'ds1',
  'virtual'::public.datasets__source_type,
  true
);

select plan(6);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a9000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.rpc_workspaces__transfer_all_owned_resources (
    'a9001001-0000-4000-8000-000000000001'::uuid,
    'a9000001-0000-4000-8000-000000000001'::uuid,
    'a9000003-0000-4000-8000-000000000003'::uuid
  ),
  3,
  'returns the number of resources moved'
);

set local role postgres;

select is(
  (
    select count(*)::int
    from public.dashboards
    where workspace_id = 'a9001001-0000-4000-8000-000000000001'::uuid
      and owner_id = 'a9000001-0000-4000-8000-000000000001'::uuid
  ),
  0,
  'the leaver owns no dashboards afterwards'
);

select is(
  (
    select count(*)::int
    from public.datasets
    where workspace_id = 'a9001001-0000-4000-8000-000000000001'::uuid
      and owner_id = 'a9000001-0000-4000-8000-000000000001'::uuid
  ),
  0,
  'the leaver owns no datasets afterwards'
);

select is(
  (
    select count(*)::int
    from public.usage_analytics_events
    where event_name = 'resource.ownership_transferred'
  ),
  3,
  'one audit row per transferred resource'
);

-- The whole point: removal is now possible.
select lives_ok(
  $$delete from public.workspace_memberships
     where workspace_id = 'a9001001-0000-4000-8000-000000000001'::uuid
       and user_id = 'a9000001-0000-4000-8000-000000000001'::uuid$$,
  'the leaver can now be removed from the workspace'
);

-- The outer gate must reject a non-manager on its own, independently of the
-- per-resource RPC it delegates to.
--
-- Why this specific shape: by now the leaver owns nothing (everything was moved
-- above), so the loop body never executes and the INNER gate inside
-- rpc_resources__transfer_ownership never fires. If the outer
-- util__can_manage_workspace_settings check were ever removed, this call would
-- silently return 0 for an unauthorised caller and no other assertion in the
-- suite would notice. a9000003 is a plain member, never promoted in this file.
set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a9000003-0000-4000-8000-000000000003"}',
  true
);

select throws_ok(
  $$select public.rpc_workspaces__transfer_all_owned_resources (
      'a9001001-0000-4000-8000-000000000001'::uuid,
      'a9000001-0000-4000-8000-000000000001'::uuid,
      'a9000003-0000-4000-8000-000000000003'::uuid
    )$$,
  '42501',
  'insufficient_privilege',
  'the outer gate rejects a non-manager even when the loop would be empty'
);

select * from finish();

rollback;
