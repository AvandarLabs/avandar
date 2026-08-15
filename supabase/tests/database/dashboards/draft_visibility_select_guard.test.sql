\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- `draft` is the state in which the owner has not yet decided the dashboard is
-- ready for anyone else. P2 gave the state that product meaning and P3 shipped
-- the publishing control, but the rule lived only in the client: RLS still let
-- a viewer SELECT the whole row, `config` jsonb included, for a dashboard the
-- UI refused to open. This file locks the rule into
-- `public.util__auth_user_may_select_dashboard`.
--
-- The rule: past the owner and settings-admin short-circuits, a draft needs
-- EDIT rights. Share holders and workspace app roles below `editor` do not
-- clear it.

insert into auth.users (id, email, aud, role)
values
  ('da000001-0000-4000-8000-000000000001'::uuid, 'da_owner@test.dev', 'authenticated', 'authenticated'),
  ('da000002-0000-4000-8000-000000000002'::uuid, 'da_admin@test.dev', 'authenticated', 'authenticated'),
  ('da000003-0000-4000-8000-000000000003'::uuid, 'da_viewer_share@test.dev', 'authenticated', 'authenticated'),
  ('da000004-0000-4000-8000-000000000004'::uuid, 'da_editor_share@test.dev', 'authenticated', 'authenticated'),
  ('da000005-0000-4000-8000-000000000005'::uuid, 'da_app_viewer@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'da001001-0000-4000-8000-000000000001'::uuid,
  'da000001-0000-4000-8000-000000000001'::uuid,
  'da workspace',
  'da-draft-visibility-ws'
);

-- The share holders deliberately carry NO app role, so what the assertions
-- isolate is the share grant on its own. `da app viewers` is the mirror case:
-- an app role on its own with no share at all.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('da00cf01-0000-4000-8000-000000000001'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'da settings admins', false),
  ('da00cf02-0000-4000-8000-000000000002'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'da app viewers', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('da00cf01-0000-4000-8000-000000000001'::uuid, 'settings'::public.app_type, 'admin'::public.role_level),
  ('da00cf02-0000-4000-8000-000000000002'::uuid, 'dashboards'::public.app_type, 'viewer'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('da002001-0000-4000-8000-000000000001'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'da000001-0000-4000-8000-000000000001'::uuid, null),
  ('da002002-0000-4000-8000-000000000002'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'da000002-0000-4000-8000-000000000002'::uuid, 'da00cf01-0000-4000-8000-000000000001'::uuid),
  ('da002003-0000-4000-8000-000000000003'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'da000003-0000-4000-8000-000000000003'::uuid, null),
  ('da002004-0000-4000-8000-000000000004'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'da000004-0000-4000-8000-000000000004'::uuid, null),
  ('da002005-0000-4000-8000-000000000005'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'da000005-0000-4000-8000-000000000005'::uuid, 'da00cf02-0000-4000-8000-000000000002'::uuid);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('da003001-0000-4000-8000-000000000001'::uuid, 'da000001-0000-4000-8000-000000000001'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'da002001-0000-4000-8000-000000000001'::uuid, 'DA Owner', 'DA Owner'),
  ('da003002-0000-4000-8000-000000000002'::uuid, 'da000002-0000-4000-8000-000000000002'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'da002002-0000-4000-8000-000000000002'::uuid, 'DA Admin', 'DA Admin'),
  ('da003003-0000-4000-8000-000000000003'::uuid, 'da000003-0000-4000-8000-000000000003'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'da002003-0000-4000-8000-000000000003'::uuid, 'DA Viewer Share', 'DA Viewer Share'),
  ('da003004-0000-4000-8000-000000000004'::uuid, 'da000004-0000-4000-8000-000000000004'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'da002004-0000-4000-8000-000000000004'::uuid, 'DA Editor Share', 'DA Editor Share'),
  ('da003005-0000-4000-8000-000000000005'::uuid, 'da000005-0000-4000-8000-000000000005'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'da002005-0000-4000-8000-000000000005'::uuid, 'DA App Viewer', 'DA App Viewer');

-- Every dashboard is owned by da owner and is unrestricted, so the only thing
-- separating the cases is `visibility` and the grant each reader holds. The
-- `workspace` and `public` rows carry a `snapshot_revision` because
-- `dashboards__settled_snapshot_consistent` requires one for a settled row
-- outside `draft`.
insert into public.dashboards (
  id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted,
  visibility, snapshot_revision
)
values
  ('da005001-0000-4000-8000-000000000001'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'da000001-0000-4000-8000-000000000001'::uuid, 'da003001-0000-4000-8000-000000000001'::uuid, 'da draft viewer share', '{}'::jsonb, false, 'draft', null),
  ('da005002-0000-4000-8000-000000000002'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'da000001-0000-4000-8000-000000000001'::uuid, 'da003001-0000-4000-8000-000000000001'::uuid, 'da draft editor share', '{}'::jsonb, false, 'draft', null),
  ('da005003-0000-4000-8000-000000000003'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'da000001-0000-4000-8000-000000000001'::uuid, 'da003001-0000-4000-8000-000000000001'::uuid, 'da draft unshared', '{}'::jsonb, false, 'draft', null),
  ('da005004-0000-4000-8000-000000000004'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'da000001-0000-4000-8000-000000000001'::uuid, 'da003001-0000-4000-8000-000000000001'::uuid, 'da published viewer share', '{}'::jsonb, false, 'workspace', 'da006004-0000-4000-8000-000000000004'::uuid),
  ('da005005-0000-4000-8000-000000000005'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'da000001-0000-4000-8000-000000000001'::uuid, 'da003001-0000-4000-8000-000000000001'::uuid, 'da public', '{}'::jsonb, false, 'public', 'da006005-0000-4000-8000-000000000005'::uuid);

insert into public.resource_shares (
  id, workspace_id, resource_type, resource_id, principal_type, principal_id, role
)
values
  ('da004001-0000-4000-8000-000000000001'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'dashboard'::public.resource_type, 'da005001-0000-4000-8000-000000000001'::uuid, 'user'::public.share_principal_type, 'da000003-0000-4000-8000-000000000003'::uuid, 'viewer'::public.role_level),
  ('da004002-0000-4000-8000-000000000002'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'dashboard'::public.resource_type, 'da005002-0000-4000-8000-000000000002'::uuid, 'user'::public.share_principal_type, 'da000004-0000-4000-8000-000000000004'::uuid, 'editor'::public.role_level),
  ('da004003-0000-4000-8000-000000000003'::uuid, 'da001001-0000-4000-8000-000000000001'::uuid, 'dashboard'::public.resource_type, 'da005004-0000-4000-8000-000000000004'::uuid, 'user'::public.share_principal_type, 'da000003-0000-4000-8000-000000000003'::uuid, 'viewer'::public.role_level);

select plan(8);

-- The owner --------------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"da000001-0000-4000-8000-000000000001"}',
  true
);

select is(
  public.util__auth_user_may_select_dashboard ('da005001-0000-4000-8000-000000000001'::uuid),
  true,
  'the owner still sees their own draft'
);

-- The settings admin ------------------------------------------------------

-- The settings-admin short-circuit sits ABOVE the draft gate, so nothing here
-- changes: an admin keeps read on an unrestricted draft that is not private to
-- its owner.

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"da000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__auth_user_may_select_dashboard ('da005003-0000-4000-8000-000000000003'::uuid),
  true,
  'a settings admin still sees another member''s unrestricted draft'
);

-- The viewer share --------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"da000003-0000-4000-8000-000000000003"}',
  true
);

select is(
  public.util__auth_user_may_select_dashboard ('da005001-0000-4000-8000-000000000001'::uuid),
  false,
  'a viewer share does not open a draft'
);

-- The helper returning false is not enough on its own: the point of the
-- change is that the ROW, `config` jsonb and all, never reaches the client.
select is(
  (
    select count(*)::int
    from public.dashboards
    where id = 'da005001-0000-4000-8000-000000000001'::uuid
  ),
  0,
  'RLS hides the draft row from the viewer-share user'
);

-- Publishing to the workspace is exactly the act that hands the same user the
-- same dashboard.
select is(
  public.util__auth_user_may_select_dashboard ('da005004-0000-4000-8000-000000000004'::uuid),
  true,
  'the same viewer share DOES open the dashboard once it is published to the workspace'
);

-- The editor share --------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"da000004-0000-4000-8000-000000000004"}',
  true
);

select is(
  public.util__auth_user_may_select_dashboard ('da005002-0000-4000-8000-000000000002'::uuid),
  true,
  'an editor share DOES open a draft'
);

-- The workspace dashboards viewer app role --------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"da000005-0000-4000-8000-000000000005"}',
  true
);

select is(
  public.util__auth_user_may_select_dashboard ('da005003-0000-4000-8000-000000000003'::uuid),
  false,
  'the dashboards viewer app role alone does not open another member''s draft'
);

-- A public dashboard short-circuits above every one of these checks, so the
-- draft gate must leave it untouched.
select is(
  public.util__auth_user_may_select_dashboard ('da005005-0000-4000-8000-000000000005'::uuid),
  true,
  'a public dashboard is unaffected by the draft gate'
);

select * from finish();

rollback;
