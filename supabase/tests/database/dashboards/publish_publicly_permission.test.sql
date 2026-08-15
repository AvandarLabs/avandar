\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- Publishing a dashboard publicly is an admin-tier act. The rule is about the
-- TRANSITION into `public`, not about the state: an editor who owns a
-- dashboard an admin published must still be able to save and republish it.
--
-- See docs/superpowers/specs/2026-08-15-private-dashboards-merged-share-surface-design.md
-- section 5.

insert into auth.users (id, email, aud, role)
values
  ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3_editor@test.dev', 'authenticated', 'authenticated'),
  ('d3000002-0000-4000-8000-000000000002'::uuid, 'd3_admin@test.dev', 'authenticated', 'authenticated'),
  ('d3000003-0000-4000-8000-000000000003'::uuid, 'd3_owner@test.dev', 'authenticated', 'authenticated'),
  ('d3000004-0000-4000-8000-000000000004'::uuid, 'd3_viewer@test.dev', 'authenticated', 'authenticated'),
  ('d3000005-0000-4000-8000-000000000005'::uuid, 'd3_outsider@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'd3001001-0000-4000-8000-000000000001'::uuid,
  'd3000003-0000-4000-8000-000000000003'::uuid,
  'd3 workspace',
  'd3-publish-publicly-ws'
);

-- `d3 owner group` deliberately carries NO dashboards app role. The workspace
-- owner's authority has to come from the owner short-circuit in
-- `util__auth_user_meets_min_app_role`, which is what the last case pins down.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('d300cf01-0000-4000-8000-000000000001'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3 editors', false),
  ('d300cf02-0000-4000-8000-000000000002'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3 admins', false),
  ('d300cf03-0000-4000-8000-000000000003'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3 viewers', false),
  ('d300cf04-0000-4000-8000-000000000004'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3 owner group', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('d300cf01-0000-4000-8000-000000000001'::uuid, 'dashboards'::public.app_type, 'editor'::public.role_level),
  ('d300cf02-0000-4000-8000-000000000002'::uuid, 'dashboards'::public.app_type, 'admin'::public.role_level),
  ('d300cf03-0000-4000-8000-000000000003'::uuid, 'dashboards'::public.app_type, 'viewer'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('d3002001-0000-4000-8000-000000000001'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'd300cf01-0000-4000-8000-000000000001'::uuid),
  ('d3002002-0000-4000-8000-000000000002'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3000002-0000-4000-8000-000000000002'::uuid, 'd300cf02-0000-4000-8000-000000000002'::uuid),
  ('d3002003-0000-4000-8000-000000000003'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3000003-0000-4000-8000-000000000003'::uuid, 'd300cf04-0000-4000-8000-000000000004'::uuid),
  ('d3002004-0000-4000-8000-000000000004'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3000004-0000-4000-8000-000000000004'::uuid, 'd300cf03-0000-4000-8000-000000000003'::uuid);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('d3003001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3002001-0000-4000-8000-000000000001'::uuid, 'D3 Editor', 'D3 Editor'),
  ('d3003002-0000-4000-8000-000000000002'::uuid, 'd3000002-0000-4000-8000-000000000002'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3002002-0000-4000-8000-000000000002'::uuid, 'D3 Admin', 'D3 Admin'),
  ('d3003003-0000-4000-8000-000000000003'::uuid, 'd3000003-0000-4000-8000-000000000003'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3002003-0000-4000-8000-000000000003'::uuid, 'D3 Owner', 'D3 Owner'),
  ('d3003004-0000-4000-8000-000000000004'::uuid, 'd3000004-0000-4000-8000-000000000004'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3002004-0000-4000-8000-000000000004'::uuid, 'D3 Viewer', 'D3 Viewer');

-- Dashboards owned by the editor: one draft, one workspace-published, one
-- already public, and one carrying an open publish claim that targets `public`.
--
-- The last one is seeded here rather than through the editor because acquiring
-- that claim is exactly what the trigger forbids an editor to do. `auth.uid()`
-- is null on this direct psql path, so the seed is exempt.
--
-- The admin and the workspace owner each own a workspace-published dashboard.
-- They have to own them: `util__auth_user_may_select_dashboard` hides another
-- member's unrestricted, unshared, non-public dashboard even from a dashboards
-- admin, so an UPDATE against someone else's row would match zero rows and
-- assert nothing at all.
insert into public.dashboards (
  id, workspace_id, owner_id, owner_profile_id, name, config, visibility,
  snapshot_revision, snapshot_transition_kind, snapshot_transition_revision,
  snapshot_transition_prior_revision, snapshot_transition_prior_visibility,
  snapshot_transition_target_visibility
)
values
  ('d3005001-0000-4000-8000-000000000001'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'd3003001-0000-4000-8000-000000000001'::uuid, 'd3 draft', '{}'::jsonb, 'draft', null, null, null, null, null, null),
  ('d3005002-0000-4000-8000-000000000002'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'd3003001-0000-4000-8000-000000000001'::uuid, 'd3 internal', '{}'::jsonb, 'workspace', 'd3005002-0000-4000-8000-000000000002'::uuid, null, null, null, null, null),
  ('d3005003-0000-4000-8000-000000000003'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'd3003001-0000-4000-8000-000000000001'::uuid, 'd3 public', '{}'::jsonb, 'public', 'd3005003-0000-4000-8000-000000000003'::uuid, null, null, null, null, null),
  ('d3005004-0000-4000-8000-000000000004'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'd3003001-0000-4000-8000-000000000001'::uuid, 'd3 claiming public', '{}'::jsonb, 'workspace', 'd3005004-0000-4000-8000-000000000004'::uuid, 'publish', 'd3006099-0000-4000-8000-000000000099'::uuid, 'd3005004-0000-4000-8000-000000000004'::uuid, 'workspace', 'public'),
  ('d3005005-0000-4000-8000-000000000005'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3000002-0000-4000-8000-000000000002'::uuid, 'd3003002-0000-4000-8000-000000000002'::uuid, 'd3 admin owned', '{}'::jsonb, 'workspace', 'd3005005-0000-4000-8000-000000000005'::uuid, null, null, null, null, null),
  ('d3005006-0000-4000-8000-000000000006'::uuid, 'd3001001-0000-4000-8000-000000000001'::uuid, 'd3000003-0000-4000-8000-000000000003'::uuid, 'd3003003-0000-4000-8000-000000000003'::uuid, 'd3 owner owned', '{}'::jsonb, 'workspace', 'd3005006-0000-4000-8000-000000000006'::uuid, null, null, null, null, null);

select plan(14);

-- A dashboard never moves straight into a reader boundary: it acquires a
-- durable publish claim that stages `snapshot_transition_target_visibility`,
-- then settles that claim by flipping `visibility`. See
-- `private.dashboards__validate_snapshot_transition_update`. Every update below
-- uses that two-step shape, so what the assertions isolate is the permission
-- check and not the transition machinery.

-- The editor ----------------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d3000001-0000-4000-8000-000000000001"}',
  true
);

select throws_ok(
  $$update public.dashboards
       set snapshot_transition_kind = 'publish',
           snapshot_transition_revision = 'd3006001-0000-4000-8000-000000000001'::uuid,
           snapshot_transition_prior_revision = snapshot_revision,
           snapshot_transition_prior_visibility = visibility,
           snapshot_transition_target_visibility = 'public'
     where id = 'd3005001-0000-4000-8000-000000000001'::uuid$$,
  '42501',
  null,
  'an editor cannot publish a draft publicly'
);

select throws_ok(
  $$update public.dashboards
       set snapshot_transition_kind = 'publish',
           snapshot_transition_revision = 'd3006002-0000-4000-8000-000000000002'::uuid,
           snapshot_transition_prior_revision = snapshot_revision,
           snapshot_transition_prior_visibility = visibility,
           snapshot_transition_target_visibility = 'public'
     where id = 'd3005002-0000-4000-8000-000000000002'::uuid$$,
  '42501',
  null,
  'an editor cannot upgrade a workspace dashboard to public'
);

-- The trigger only covers UPDATE, so the INSERT policy is what stops a
-- dashboard from being born public. Without it an editor could mint an
-- anon-readable row, squat the global slug namespace, and aim
-- `snapshot_revision` at storage objects it does not own.
select throws_ok(
  $$insert into public.dashboards (
      id, workspace_id, owner_id, owner_profile_id, name, config, visibility,
      snapshot_revision
    )
    values (
      'd3005007-0000-4000-8000-000000000007'::uuid,
      'd3001001-0000-4000-8000-000000000001'::uuid,
      'd3000001-0000-4000-8000-000000000001'::uuid,
      'd3003001-0000-4000-8000-000000000001'::uuid,
      'd3 born public',
      '{}'::jsonb,
      'public',
      'd3005007-0000-4000-8000-000000000007'::uuid
    )$$,
  '42501',
  null,
  'an editor cannot insert a dashboard that is born public'
);

select lives_ok(
  $$update public.dashboards
       set snapshot_transition_kind = 'publish',
           snapshot_transition_revision = 'd3006003-0000-4000-8000-000000000003'::uuid,
           snapshot_transition_prior_revision = snapshot_revision,
           snapshot_transition_prior_visibility = visibility,
           snapshot_transition_target_visibility = 'workspace'
     where id = 'd3005001-0000-4000-8000-000000000001'::uuid;

    update public.dashboards
       set visibility = 'workspace',
           snapshot_revision = 'd3006003-0000-4000-8000-000000000003'::uuid,
           snapshot_transition_kind = null,
           snapshot_transition_revision = null,
           snapshot_transition_prior_revision = null,
           snapshot_transition_prior_visibility = null,
           snapshot_transition_target_visibility = null
     where id = 'd3005001-0000-4000-8000-000000000001'::uuid$$,
  'an editor CAN publish to the workspace'
);

select lives_ok(
  $$update public.dashboards
       set name = 'd3 public renamed'
     where id = 'd3005003-0000-4000-8000-000000000003'::uuid$$,
  'an editor CAN still edit a dashboard that is already public'
);

-- supabase-js PATCHes the whole row, so a plain rename arrives with
-- `visibility` in the SET list and re-asserts the value it already had. Only
-- the `old.visibility is distinct from` comparison lets this through: a rule
-- phrased on NEW alone would reject every save of a published dashboard.
select lives_ok(
  $$update public.dashboards
       set name = 'd3 public re-saved', visibility = visibility
     where id = 'd3005003-0000-4000-8000-000000000003'::uuid$$,
  'an editor CAN re-save a public dashboard with visibility in the SET list'
);

-- Same argument on the claim half: the recovery path re-sends the unchanged
-- `public` target, and the OLD comparison is what keeps it from tripping.
select lives_ok(
  $$update public.dashboards
       set snapshot_transition_kind = 'abort_publish',
           snapshot_transition_target_visibility =
             snapshot_transition_target_visibility
     where id = 'd3005004-0000-4000-8000-000000000004'::uuid$$,
  'an editor CAN abort a publish claim that already targets public'
);

-- The viewer and the non-member ---------------------------------------------

-- These two are stopped by RLS before the trigger is reached, so the UPDATE
-- matches no rows rather than raising. Counting the affected rows is the
-- assertion that actually distinguishes "blocked" from "silently allowed"; a
-- bare `lives_ok` would pass either way.

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d3000004-0000-4000-8000-000000000004"}',
  true
);

with attempted as (
  update public.dashboards
     set snapshot_transition_kind = 'publish',
         snapshot_transition_revision = 'd3006004-0000-4000-8000-000000000004'::uuid,
         snapshot_transition_prior_revision = snapshot_revision,
         snapshot_transition_prior_visibility = visibility,
         snapshot_transition_target_visibility = 'public'
   where id = 'd3005002-0000-4000-8000-000000000002'::uuid
  returning id
)
select is(
  count(*)::int,
  0,
  'a dashboards viewer cannot start a public publish'
)
from attempted;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d3000005-0000-4000-8000-000000000005"}',
  true
);

with attempted as (
  update public.dashboards
     set snapshot_transition_kind = 'publish',
         snapshot_transition_revision = 'd3006005-0000-4000-8000-000000000005'::uuid,
         snapshot_transition_prior_revision = snapshot_revision,
         snapshot_transition_prior_visibility = visibility,
         snapshot_transition_target_visibility = 'public'
   where id = 'd3005002-0000-4000-8000-000000000002'::uuid
  returning id
)
select is(
  count(*)::int,
  0,
  'a non-member cannot start a public publish'
)
from attempted;

-- The admin -----------------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d3000002-0000-4000-8000-000000000002"}',
  true
);

select lives_ok(
  $$update public.dashboards
       set snapshot_transition_kind = 'publish',
           snapshot_transition_revision = 'd3006006-0000-4000-8000-000000000006'::uuid,
           snapshot_transition_prior_revision = snapshot_revision,
           snapshot_transition_prior_visibility = visibility,
           snapshot_transition_target_visibility = 'public'
     where id = 'd3005005-0000-4000-8000-000000000005'::uuid;

    update public.dashboards
       set visibility = 'public',
           snapshot_revision = 'd3006006-0000-4000-8000-000000000006'::uuid,
           snapshot_transition_kind = null,
           snapshot_transition_revision = null,
           snapshot_transition_prior_revision = null,
           snapshot_transition_prior_visibility = null,
           snapshot_transition_target_visibility = null
     where id = 'd3005005-0000-4000-8000-000000000005'::uuid$$,
  'a dashboards admin CAN upgrade a workspace dashboard to public'
);

select is(
  (
    select visibility
    from public.dashboards
    where id = 'd3005005-0000-4000-8000-000000000005'::uuid
  ),
  'public'::public.dashboard_visibility,
  'the dashboard the admin published really is public'
);

-- The workspace owner without a dashboards app role --------------------------

-- `util__auth_user_meets_min_app_role` grants a workspace owner any minimum
-- unconditionally, so this passes with no dashboards role attached at all.

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d3000003-0000-4000-8000-000000000003"}',
  true
);

select is(
  public.util__get_auth_user_app_role (
    'd3001001-0000-4000-8000-000000000001'::uuid,
    'dashboards'::public.app_type
  ),
  null,
  'the workspace owner holds no dashboards app role'
);

select lives_ok(
  $$update public.dashboards
       set snapshot_transition_kind = 'publish',
           snapshot_transition_revision = 'd3006007-0000-4000-8000-000000000007'::uuid,
           snapshot_transition_prior_revision = snapshot_revision,
           snapshot_transition_prior_visibility = visibility,
           snapshot_transition_target_visibility = 'public'
     where id = 'd3005006-0000-4000-8000-000000000006'::uuid;

    update public.dashboards
       set visibility = 'public',
           snapshot_revision = 'd3006007-0000-4000-8000-000000000007'::uuid,
           snapshot_transition_kind = null,
           snapshot_transition_revision = null,
           snapshot_transition_prior_revision = null,
           snapshot_transition_prior_visibility = null,
           snapshot_transition_target_visibility = null
     where id = 'd3005006-0000-4000-8000-000000000006'::uuid$$,
  'a workspace owner without the dashboards admin role CAN publish publicly'
);

select is(
  (
    select visibility
    from public.dashboards
    where id = 'd3005006-0000-4000-8000-000000000006'::uuid
  ),
  'public'::public.dashboard_visibility,
  'the dashboard the workspace owner published really is public'
);

select * from finish();

rollback;
