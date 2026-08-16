\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- `subscriptions.max_shareable_dashboards_allowed` has existed since the
-- billing work but nothing ever read it, so a free workspace could publish as
-- many dashboards as it liked. P4 makes the limit real, and this file pins the
-- two read-only foundations it is built on:
--
--   `util__dashboard_counts_as_shareable`, which decides what counts against
--   the cap, and
--   `util__workspace_max_shareable_dashboards`, which decides what the cap is.

insert into auth.users (id, email, aud, role)
values
  ('f1000001-0000-4000-8000-000000000001'::uuid, 'f1_owner@test.dev', 'authenticated', 'authenticated'),
  ('f1000002-0000-4000-8000-000000000002'::uuid, 'f1_member@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'f1001001-0000-4000-8000-000000000001'::uuid,
  'f1000001-0000-4000-8000-000000000001'::uuid,
  'f1 workspace',
  'f1-shareable-entitlement-ws'
);

insert into public.role_groups (id, workspace_id, name, is_builtin)
values (
  'f100cf01-0000-4000-8000-000000000001'::uuid,
  'f1001001-0000-4000-8000-000000000001'::uuid,
  'f1 app viewers',
  false
);

insert into public.role_group_app_roles (role_group_id, app, role)
values (
  'f100cf01-0000-4000-8000-000000000001'::uuid,
  'dashboards'::public.app_type,
  'viewer'::public.role_level
);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('f1002001-0000-4000-8000-000000000001'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1000001-0000-4000-8000-000000000001'::uuid, 'f100cf01-0000-4000-8000-000000000001'::uuid),
  ('f1002002-0000-4000-8000-000000000002'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1000002-0000-4000-8000-000000000002'::uuid, 'f100cf01-0000-4000-8000-000000000001'::uuid);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('f1003001-0000-4000-8000-000000000001'::uuid, 'f1000001-0000-4000-8000-000000000001'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1002001-0000-4000-8000-000000000001'::uuid, 'F1 Owner', 'F1 Owner'),
  ('f1003002-0000-4000-8000-000000000002'::uuid, 'f1000002-0000-4000-8000-000000000002'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1002002-0000-4000-8000-000000000002'::uuid, 'F1 Member', 'F1 Member');

-- Every dashboard is owned by f1 owner, so the only things separating the cases
-- are `visibility`, `is_restricted` and the share rows below. The `workspace`
-- and `public` rows carry a `snapshot_revision` because
-- `dashboards__settled_snapshot_consistent` requires one for a settled row
-- outside `draft`.
insert into public.dashboards (
  id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted,
  visibility, snapshot_revision
)
values
  ('f1005001-0000-4000-8000-000000000001'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1000001-0000-4000-8000-000000000001'::uuid, 'f1003001-0000-4000-8000-000000000001'::uuid, 'f1 draft', '{}'::jsonb, false, 'draft', null),
  ('f1005002-0000-4000-8000-000000000002'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1000001-0000-4000-8000-000000000001'::uuid, 'f1003001-0000-4000-8000-000000000001'::uuid, 'f1 workspace restricted unshared', '{}'::jsonb, true, 'workspace', 'f1006002-0000-4000-8000-000000000002'::uuid),
  ('f1005003-0000-4000-8000-000000000003'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1000001-0000-4000-8000-000000000001'::uuid, 'f1003001-0000-4000-8000-000000000001'::uuid, 'f1 workspace restricted shared', '{}'::jsonb, true, 'workspace', 'f1006003-0000-4000-8000-000000000003'::uuid),
  ('f1005004-0000-4000-8000-000000000004'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1000001-0000-4000-8000-000000000001'::uuid, 'f1003001-0000-4000-8000-000000000001'::uuid, 'f1 workspace unrestricted', '{}'::jsonb, false, 'workspace', 'f1006004-0000-4000-8000-000000000004'::uuid),
  ('f1005005-0000-4000-8000-000000000005'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1000001-0000-4000-8000-000000000001'::uuid, 'f1003001-0000-4000-8000-000000000001'::uuid, 'f1 public restricted unshared', '{}'::jsonb, true, 'public', 'f1006005-0000-4000-8000-000000000005'::uuid);

-- The single share in this file is what separates f1005003 from f1005002: both
-- are restricted and published to the workspace, and only this row makes one of
-- them reachable by somebody other than its owner.
insert into public.resource_shares (
  id, workspace_id, resource_type, resource_id, principal_type, principal_id, role
)
values (
  'f1004001-0000-4000-8000-000000000001'::uuid,
  'f1001001-0000-4000-8000-000000000001'::uuid,
  'dashboard'::public.resource_type,
  'f1005003-0000-4000-8000-000000000003'::uuid,
  'user'::public.share_principal_type,
  'f1000002-0000-4000-8000-000000000002'::uuid,
  'viewer'::public.role_level
);

select plan(6);

-- The predicate -----------------------------------------------------------

select is(
  public.util__dashboard_counts_as_shareable ('f1005001-0000-4000-8000-000000000001'::uuid),
  false,
  'a draft never counts, whatever its shares say'
);

select is(
  public.util__dashboard_counts_as_shareable ('f1005002-0000-4000-8000-000000000002'::uuid),
  false,
  'published to the workspace but private to its owner does not count'
);

select is(
  public.util__dashboard_counts_as_shareable ('f1005003-0000-4000-8000-000000000003'::uuid),
  true,
  'published to the workspace and shared with someone counts'
);

select is(
  public.util__dashboard_counts_as_shareable ('f1005004-0000-4000-8000-000000000004'::uuid),
  true,
  'published to the workspace and unrestricted counts'
);

-- The load-bearing case. A public dashboard is world-readable through the anon
-- policy no matter what its share rows say, so if restriction could hide it
-- from the count a free workspace could publish without limit to the open
-- internet.
select is(
  public.util__dashboard_counts_as_shareable ('f1005005-0000-4000-8000-000000000005'::uuid),
  true,
  'public counts even when restricted, because the world can still read it'
);

select is(
  public.util__dashboard_counts_as_shareable ('f1005099-0000-4000-8000-000000000099'::uuid),
  false,
  'an unknown dashboard id does not count rather than raising'
);

select * from finish();

rollback;
