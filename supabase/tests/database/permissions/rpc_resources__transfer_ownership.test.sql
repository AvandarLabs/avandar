\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a8000001-0000-4000-8000-000000000001'::uuid, 'a8_owner@test.dev', 'authenticated', 'authenticated'),
  ('a8000002-0000-4000-8000-000000000002'::uuid, 'a8_admin@test.dev', 'authenticated', 'authenticated'),
  ('a8000003-0000-4000-8000-000000000003'::uuid, 'a8_target@test.dev', 'authenticated', 'authenticated'),
  ('a8000004-0000-4000-8000-000000000004'::uuid, 'a8_outsider@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a8001001-0000-4000-8000-000000000001'::uuid,
  'a8000002-0000-4000-8000-000000000002'::uuid,
  'a8 workspace',
  'a8-transfer-ws'
);

insert into public.role_groups (id, workspace_id, name, is_builtin)
values ('a800cf01-0000-4000-8000-000000000001'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8 admin group', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values ('a800cf01-0000-4000-8000-000000000001'::uuid, 'settings'::public.app_type, 'admin'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('a8002001-0000-4000-8000-000000000001'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8000001-0000-4000-8000-000000000001'::uuid, null),
  ('a8002002-0000-4000-8000-000000000002'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8000002-0000-4000-8000-000000000002'::uuid, 'a800cf01-0000-4000-8000-000000000001'::uuid),
  ('a8002003-0000-4000-8000-000000000003'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8000003-0000-4000-8000-000000000003'::uuid, null);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('a8003001-0000-4000-8000-000000000001'::uuid, 'a8000001-0000-4000-8000-000000000001'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8002001-0000-4000-8000-000000000001'::uuid, 'A8 Owner', 'A8 Owner'),
  ('a8003002-0000-4000-8000-000000000002'::uuid, 'a8000002-0000-4000-8000-000000000002'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8002002-0000-4000-8000-000000000002'::uuid, 'A8 Admin', 'A8 Admin'),
  ('a8003003-0000-4000-8000-000000000003'::uuid, 'a8000003-0000-4000-8000-000000000003'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8002003-0000-4000-8000-000000000003'::uuid, 'A8 Target', 'A8 Target');

insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted, is_public)
values (
  'a8005001-0000-4000-8000-000000000001'::uuid,
  'a8001001-0000-4000-8000-000000000001'::uuid,
  'a8000001-0000-4000-8000-000000000001'::uuid,
  'a8003001-0000-4000-8000-000000000001'::uuid,
  'private dashboard',
  '{}'::jsonb,
  true,
  false
);

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type, is_restricted)
values (
  'a8007001-0000-4000-8000-000000000001'::uuid,
  'a8001001-0000-4000-8000-000000000001'::uuid,
  'a8000001-0000-4000-8000-000000000001'::uuid,
  'a8003001-0000-4000-8000-000000000001'::uuid,
  'private dataset',
  'virtual'::public.datasets__source_type,
  true
);

select plan(13);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a8000002-0000-4000-8000-000000000002"}',
  true
);

select lives_ok(
  $$select public.rpc_resources__transfer_ownership (
      'dashboard',
      'a8005001-0000-4000-8000-000000000001'::uuid,
      'a8000003-0000-4000-8000-000000000003'::uuid
    )$$,
  'settings admin can transfer a dashboard they cannot read'
);

set local role postgres;

select is(
  (select owner_id from public.dashboards where id = 'a8005001-0000-4000-8000-000000000001'::uuid),
  'a8000003-0000-4000-8000-000000000003'::uuid,
  'dashboard owner_id moved'
);

select is(
  (select owner_profile_id from public.dashboards where id = 'a8005001-0000-4000-8000-000000000001'::uuid),
  'a8003003-0000-4000-8000-000000000003'::uuid,
  'dashboard owner_profile_id moved too, or removal stays blocked'
);

select is(
  (
    select count(*)::int
    from public.usage_analytics_events
    where event_name = 'resource.ownership_transferred'
      and payload ->> 'resourceId' = 'a8005001-0000-4000-8000-000000000001'
  ),
  1,
  'exactly one audit row written'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a8000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__auth_user_may_select_dashboard ('a8005001-0000-4000-8000-000000000001'::uuid),
  false,
  'the transferring admin still cannot read the resource'
);

select lives_ok(
  $$select public.rpc_resources__transfer_ownership (
      'dataset',
      'a8007001-0000-4000-8000-000000000001'::uuid,
      'a8000003-0000-4000-8000-000000000003'::uuid
    )$$,
  'datasets transfer too'
);

set local role postgres;

select is(
  (select owner_profile_id from public.datasets where id = 'a8007001-0000-4000-8000-000000000001'::uuid),
  'a8003003-0000-4000-8000-000000000003'::uuid,
  'dataset owner_profile_id moved too'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a8000002-0000-4000-8000-000000000002"}',
  true
);

-- Transferring to the current owner must be a genuine no-op that writes NO
-- audit row, so the log records only real custody changes. The dashboard is
-- already owned by a8000003 from the transfer above.
select lives_ok(
  $$select public.rpc_resources__transfer_ownership (
      'dashboard',
      'a8005001-0000-4000-8000-000000000001'::uuid,
      'a8000003-0000-4000-8000-000000000003'::uuid
    )$$,
  'transferring to the current owner succeeds silently'
);

set local role postgres;

select is(
  (
    select count(*)::int
    from public.usage_analytics_events
    where event_name = 'resource.ownership_transferred'
      and payload ->> 'resourceId' = 'a8005001-0000-4000-8000-000000000001'
  ),
  1,
  'the no-op transfer wrote no additional audit row'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a8000002-0000-4000-8000-000000000002"}',
  true
);

select throws_ok(
  $$select public.rpc_resources__transfer_ownership (
      'dashboard',
      'a8005001-0000-4000-8000-000000000001'::uuid,
      'a8000004-0000-4000-8000-000000000004'::uuid
    )$$,
  'new owner must be a member of the resource workspace',
  'cannot transfer to a non-member'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a8000003-0000-4000-8000-000000000003"}',
  true
);

select throws_ok(
  $$select public.rpc_resources__transfer_ownership (
      'dashboard',
      'a8005001-0000-4000-8000-000000000001'::uuid,
      'a8000003-0000-4000-8000-000000000003'::uuid
    )$$,
  '42501',
  'insufficient_privilege',
  'a plain member cannot transfer ownership'
);

-- The acting admin (a8000002) IS this workspace's owner, so to test the widened
-- policy we need a settings admin who is not. Promote the target user.
set local role postgres;

update public.workspace_memberships
   set role_group_id = 'a800cf01-0000-4000-8000-000000000001'::uuid
 where workspace_id = 'a8001001-0000-4000-8000-000000000001'::uuid
   and user_id = 'a8000003-0000-4000-8000-000000000003'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a8000003-0000-4000-8000-000000000003"}',
  true
);

select isnt(
  (
    select count(*)::int
    from public.usage_analytics_events
    where event_name = 'resource.ownership_transferred'
  ),
  0,
  'a settings admin who is not the workspace owner can read the audit log'
);

-- A nonexistent resource must be indistinguishable from an unauthorised one.
-- Otherwise this security-definer function is an existence oracle: its lookup
-- spans every workspace, so a distinct "not found" error would let any
-- authenticated user probe arbitrary ids before authorisation runs.
--
-- By this point a8000003 has been promoted to Settings Admin above, which makes
-- this the strongest form of the check: even a fully AUTHORISED admin gets
-- insufficient_privilege for an id that does not exist, identical to what an
-- unauthorised caller gets for one that does. That indistinguishability is the
-- property being pinned.
select throws_ok(
  $$select public.rpc_resources__transfer_ownership (
      'dashboard',
      'a8009999-0000-4000-8000-000000009999'::uuid,
      'a8000003-0000-4000-8000-000000000003'::uuid
    )$$,
  '42501',
  'insufficient_privilege',
  'a nonexistent resource raises the same error as an unauthorised one'
);

select * from finish();

rollback;
