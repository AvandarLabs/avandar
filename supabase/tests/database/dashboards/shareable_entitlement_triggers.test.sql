\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- `subscriptions.max_shareable_dashboards_allowed` becomes real here. Two
-- triggers enforce it, and this file pins both plus the three properties that
-- decide whether the enforcement is usable at all:
--
--   1. the count EXCLUDES the dashboard being modified, so a workspace that has
--      spent its one allowance can still save, rename and re-share THAT
--      dashboard;
--   2. narrowing is never blocked, so a workspace that is already over its cap
--      (grandfathered, or downgraded) always has a way back under it;
--   3. both paths are covered. Publishing is an UPDATE on `dashboards`, but
--      adding a person to an already published, self-only dashboard is a plain
--      PostgREST INSERT into `resource_shares` with no edge function anywhere,
--      and it makes the dashboard reachable by a non-owner just the same.
--
-- Every mutating statement below runs as `authenticated` with a JWT subject.
-- The guard exempts every other caller, so a statement run as `postgres` would
-- assert nothing at all.

insert into auth.users (id, email, aud, role)
values
  ('f2000001-0000-4000-8000-000000000001'::uuid, 'f2_owner@test.dev', 'authenticated', 'authenticated'),
  ('f2000002-0000-4000-8000-000000000002'::uuid, 'f2_member@test.dev', 'authenticated', 'authenticated'),
  ('f2000003-0000-4000-8000-000000000003'::uuid, 'f2_member_two@test.dev', 'authenticated', 'authenticated');

-- Three workspaces, all owned by the same user so that the owner short-circuit
-- in `util__auth_user_meets_min_app_role` supplies the Dashboards admin tier
-- and the publish-publicly trigger never becomes the reason a case fails.
insert into public.workspaces (id, owner_id, name, slug)
values
  ('f2001001-0000-4000-8000-000000000001'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f2 free workspace', 'f2-free-ws'),
  ('f2001002-0000-4000-8000-000000000002'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f2 paid workspace', 'f2-paid-ws'),
  ('f2001003-0000-4000-8000-000000000003'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f2 over-cap workspace', 'f2-over-cap-ws');

insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('f200cf01-0000-4000-8000-000000000001'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2 free group', false),
  ('f200cf02-0000-4000-8000-000000000002'::uuid, 'f2001002-0000-4000-8000-000000000002'::uuid, 'f2 paid group', false),
  ('f200cf03-0000-4000-8000-000000000003'::uuid, 'f2001003-0000-4000-8000-000000000003'::uuid, 'f2 over-cap group', false);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('f2002001-0000-4000-8000-000000000001'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f200cf01-0000-4000-8000-000000000001'::uuid),
  ('f2002002-0000-4000-8000-000000000002'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2000002-0000-4000-8000-000000000002'::uuid, 'f200cf01-0000-4000-8000-000000000001'::uuid),
  ('f2002003-0000-4000-8000-000000000003'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2000003-0000-4000-8000-000000000003'::uuid, 'f200cf01-0000-4000-8000-000000000001'::uuid),
  ('f2002004-0000-4000-8000-000000000004'::uuid, 'f2001002-0000-4000-8000-000000000002'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f200cf02-0000-4000-8000-000000000002'::uuid),
  ('f2002005-0000-4000-8000-000000000005'::uuid, 'f2001003-0000-4000-8000-000000000003'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f200cf03-0000-4000-8000-000000000003'::uuid),
  ('f2002006-0000-4000-8000-000000000006'::uuid, 'f2001003-0000-4000-8000-000000000003'::uuid, 'f2000002-0000-4000-8000-000000000002'::uuid, 'f200cf03-0000-4000-8000-000000000003'::uuid);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('f2003001-0000-4000-8000-000000000001'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2002001-0000-4000-8000-000000000001'::uuid, 'F2 Owner', 'F2 Owner'),
  ('f2003002-0000-4000-8000-000000000002'::uuid, 'f2000002-0000-4000-8000-000000000002'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2002002-0000-4000-8000-000000000002'::uuid, 'F2 Member', 'F2 Member'),
  ('f2003003-0000-4000-8000-000000000003'::uuid, 'f2000003-0000-4000-8000-000000000003'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2002003-0000-4000-8000-000000000003'::uuid, 'F2 Member Two', 'F2 Member Two'),
  ('f2003004-0000-4000-8000-000000000004'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f2001002-0000-4000-8000-000000000002'::uuid, 'f2002004-0000-4000-8000-000000000004'::uuid, 'F2 Paid Owner', 'F2 Paid Owner'),
  ('f2003005-0000-4000-8000-000000000005'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f2001003-0000-4000-8000-000000000003'::uuid, 'f2002005-0000-4000-8000-000000000005'::uuid, 'F2 Over Owner', 'F2 Over Owner'),
  ('f2003006-0000-4000-8000-000000000006'::uuid, 'f2000002-0000-4000-8000-000000000002'::uuid, 'f2001003-0000-4000-8000-000000000003'::uuid, 'f2002006-0000-4000-8000-000000000006'::uuid, 'F2 Over Member', 'F2 Over Member');

-- The free cap of 1 is stored explicitly rather than leaned on as the fallback,
-- so these cases keep meaning what they say if the fallback ever moves.
insert into public.subscriptions (
  id, workspace_id, subscription_owner_id, feature_plan_type,
  subscription_status, max_seats_allowed, max_shareable_dashboards_allowed
)
values
  ('f2007001-0000-4000-8000-000000000001'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'free'::public.subscriptions__feature_plan_type, 'active'::public.subscriptions__status, 1, 1),
  ('f2007002-0000-4000-8000-000000000002'::uuid, 'f2001002-0000-4000-8000-000000000002'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'premium'::public.subscriptions__feature_plan_type, 'active'::public.subscriptions__status, 10, null),
  ('f2007003-0000-4000-8000-000000000003'::uuid, 'f2001003-0000-4000-8000-000000000003'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'free'::public.subscriptions__feature_plan_type, 'active'::public.subscriptions__status, 1, 1);

-- Free workspace: two drafts to spend the single allowance on, plus one
-- dashboard that is already published to the workspace and private to its
-- owner. That third one is the share path's subject: it costs nothing today,
-- and the first non-owner share is what makes it cost.
--
-- The over-cap workspace is seeded straight past its cap on this psql path,
-- which is exempt from the guard. That mirrors the real situation the triggers
-- inherit: every workspace that published freely before enforcement existed.
insert into public.dashboards (
  id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted,
  visibility, snapshot_revision
)
values
  ('f2005001-0000-4000-8000-000000000001'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f2003001-0000-4000-8000-000000000001'::uuid, 'f2 first', '{}'::jsonb, false, 'draft', null),
  ('f2005002-0000-4000-8000-000000000002'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f2003001-0000-4000-8000-000000000001'::uuid, 'f2 second', '{}'::jsonb, false, 'draft', null),
  ('f2005003-0000-4000-8000-000000000003'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f2003001-0000-4000-8000-000000000001'::uuid, 'f2 self only published', '{}'::jsonb, true, 'workspace', 'f2006003-0000-4000-8000-000000000003'::uuid),
  ('f2005011-0000-4000-8000-000000000011'::uuid, 'f2001002-0000-4000-8000-000000000002'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f2003004-0000-4000-8000-000000000004'::uuid, 'f2 paid published', '{}'::jsonb, false, 'workspace', 'f2006011-0000-4000-8000-000000000011'::uuid),
  ('f2005012-0000-4000-8000-000000000012'::uuid, 'f2001002-0000-4000-8000-000000000002'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f2003004-0000-4000-8000-000000000004'::uuid, 'f2 paid draft', '{}'::jsonb, false, 'draft', null),
  ('f2005021-0000-4000-8000-000000000021'::uuid, 'f2001003-0000-4000-8000-000000000003'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f2003005-0000-4000-8000-000000000005'::uuid, 'f2 over-cap one', '{}'::jsonb, false, 'workspace', 'f2006021-0000-4000-8000-000000000021'::uuid),
  ('f2005022-0000-4000-8000-000000000022'::uuid, 'f2001003-0000-4000-8000-000000000003'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f2003005-0000-4000-8000-000000000005'::uuid, 'f2 over-cap two', '{}'::jsonb, false, 'workspace', 'f2006022-0000-4000-8000-000000000022'::uuid),
  ('f2005023-0000-4000-8000-000000000023'::uuid, 'f2001003-0000-4000-8000-000000000003'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f2003005-0000-4000-8000-000000000005'::uuid, 'f2 over-cap three', '{}'::jsonb, false, 'workspace', 'f2006023-0000-4000-8000-000000000023'::uuid);

insert into public.resource_shares (
  id, workspace_id, resource_type, resource_id, principal_type, principal_id, role
)
values (
  'f2004001-0000-4000-8000-000000000001'::uuid,
  'f2001003-0000-4000-8000-000000000003'::uuid,
  'dashboard'::public.resource_type,
  'f2005022-0000-4000-8000-000000000022'::uuid,
  'user'::public.share_principal_type,
  'f2000002-0000-4000-8000-000000000002'::uuid,
  'viewer'::public.role_level
);

select plan(19);

-- The free workspace, publish path ------------------------------------------

-- A dashboard never moves straight into a reader boundary: it acquires a
-- durable publish claim and then settles it. See
-- `private.dashboards__validate_snapshot_transition_update`. Every publish
-- below uses that two-step shape.

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"f2000001-0000-4000-8000-000000000001"}',
  true
);

select lives_ok(
  $$update public.dashboards
       set snapshot_transition_kind = 'publish',
           snapshot_transition_revision = 'f2006101-0000-4000-8000-000000000101'::uuid,
           snapshot_transition_prior_revision = snapshot_revision,
           snapshot_transition_prior_visibility = visibility,
           snapshot_transition_target_visibility = 'workspace'
     where id = 'f2005001-0000-4000-8000-000000000001'::uuid;

    update public.dashboards
       set visibility = 'workspace',
           snapshot_revision = 'f2006101-0000-4000-8000-000000000101'::uuid,
           snapshot_transition_kind = null,
           snapshot_transition_revision = null,
           snapshot_transition_prior_revision = null,
           snapshot_transition_prior_visibility = null,
           snapshot_transition_target_visibility = null
     where id = 'f2005001-0000-4000-8000-000000000001'::uuid$$,
  'the first shareable dashboard is allowed on the free plan'
);

-- A `lives_ok` over a zero-row UPDATE passes vacuously, which has bitten this
-- repo before. Read the state back.
select is(
  (
    select visibility
    from public.dashboards
    where id = 'f2005001-0000-4000-8000-000000000001'::uuid
  ),
  'workspace'::public.dashboard_visibility,
  'the first dashboard really is published'
);

-- The message is matched, not just the SQLSTATE. `42501` is also what the
-- publish-publicly trigger raises, so the code alone would not prove which
-- guard fired.
select throws_ok(
  $$update public.dashboards
       set snapshot_transition_kind = 'publish',
           snapshot_transition_revision = 'f2006102-0000-4000-8000-000000000102'::uuid,
           snapshot_transition_prior_revision = snapshot_revision,
           snapshot_transition_prior_visibility = visibility,
           snapshot_transition_target_visibility = 'workspace'
     where id = 'f2005002-0000-4000-8000-000000000002'::uuid;

    update public.dashboards
       set visibility = 'workspace',
           snapshot_revision = 'f2006102-0000-4000-8000-000000000102'::uuid,
           snapshot_transition_kind = null,
           snapshot_transition_revision = null,
           snapshot_transition_prior_revision = null,
           snapshot_transition_prior_visibility = null,
           snapshot_transition_target_visibility = null
     where id = 'f2005002-0000-4000-8000-000000000002'::uuid$$,
  '42501',
  'This workspace''s plan allows 1 shared or public dashboard(s)',
  'the second shareable dashboard is refused on the free plan'
);

-- The audience the umbrella design worried about most. A free workspace must
-- not be able to route around the cap by choosing the wider boundary.
select throws_ok(
  $$update public.dashboards
       set snapshot_transition_kind = 'publish',
           snapshot_transition_revision = 'f2006103-0000-4000-8000-000000000103'::uuid,
           snapshot_transition_prior_revision = snapshot_revision,
           snapshot_transition_prior_visibility = visibility,
           snapshot_transition_target_visibility = 'public'
     where id = 'f2005002-0000-4000-8000-000000000002'::uuid;

    update public.dashboards
       set visibility = 'public',
           snapshot_revision = 'f2006103-0000-4000-8000-000000000103'::uuid,
           snapshot_transition_kind = null,
           snapshot_transition_revision = null,
           snapshot_transition_prior_revision = null,
           snapshot_transition_prior_visibility = null,
           snapshot_transition_target_visibility = null
     where id = 'f2005002-0000-4000-8000-000000000002'::uuid$$,
  '42501',
  'This workspace''s plan allows 1 shared or public dashboard(s)',
  'publishing a second dashboard publicly is refused too'
);

-- Property 1, on the publish path. supabase-js PATCHes whole rows, so an
-- ordinary rename re-sends `visibility` unchanged. If the count included the
-- dashboard being modified, a free workspace could publish its one allowed
-- dashboard and then never save it again.
select lives_ok(
  $$update public.dashboards
       set name = 'f2 first renamed', visibility = 'workspace'
     where id = 'f2005001-0000-4000-8000-000000000001'::uuid$$,
  'resaving the dashboard that already counts is allowed'
);

-- The free workspace, share path ---------------------------------------------

-- Property 3. Nothing about this INSERT goes through an edge function, and it
-- makes a published dashboard reachable by somebody other than its owner just
-- as surely as a publish does.
select throws_ok(
  $$insert into public.resource_shares
      (workspace_id, resource_type, resource_id, principal_type, principal_id, role)
    values (
      'f2001001-0000-4000-8000-000000000001'::uuid,
      'dashboard'::public.resource_type,
      'f2005003-0000-4000-8000-000000000003'::uuid,
      'user'::public.share_principal_type,
      'f2000002-0000-4000-8000-000000000002'::uuid,
      'viewer'::public.role_level
    )$$,
  '42501',
  'This workspace''s plan allows 1 shared or public dashboard(s)',
  'sharing a published self-only dashboard is refused at the limit'
);

-- Property 2, at the cap: retracting exposure is always available.
select lives_ok(
  $$update public.dashboards
       set visibility = 'draft',
           snapshot_transition_kind = 'unpublish',
           snapshot_transition_revision = 'f2006104-0000-4000-8000-000000000104'::uuid,
           snapshot_transition_prior_revision = snapshot_revision,
           snapshot_transition_prior_visibility = visibility,
           snapshot_transition_target_visibility = null
     where id = 'f2005001-0000-4000-8000-000000000001'::uuid;

    update public.dashboards
       set visibility = 'draft',
           snapshot_revision = null,
           snapshot_transition_kind = null,
           snapshot_transition_revision = null,
           snapshot_transition_prior_revision = null,
           snapshot_transition_prior_visibility = null,
           snapshot_transition_target_visibility = null
     where id = 'f2005001-0000-4000-8000-000000000001'::uuid$$,
  'unpublishing is allowed while the workspace is at its limit'
);

select is(
  (
    select visibility
    from public.dashboards
    where id = 'f2005001-0000-4000-8000-000000000001'::uuid
  ),
  'draft'::public.dashboard_visibility,
  'the unpublished dashboard really is back to draft'
);

-- Freed allowance, so the share that was refused above now lands.
select lives_ok(
  $$insert into public.resource_shares
      (id, workspace_id, resource_type, resource_id, principal_type, principal_id, role)
    values (
      'f2004002-0000-4000-8000-000000000002'::uuid,
      'f2001001-0000-4000-8000-000000000001'::uuid,
      'dashboard'::public.resource_type,
      'f2005003-0000-4000-8000-000000000003'::uuid,
      'user'::public.share_principal_type,
      'f2000002-0000-4000-8000-000000000002'::uuid,
      'viewer'::public.role_level
    )$$,
  'the same share is allowed once the workspace is back under its limit'
);

-- `util__dashboard_counts_as_shareable` has execute revoked from
-- `authenticated`, so every read-back through it steps out of the role and
-- straight back in. `request.jwt.claims` was set with `is_local`, so it
-- survives the round trip and the mutating cases stay end-user traffic.
reset role;

select is(
  public.util__dashboard_counts_as_shareable (
    'f2005003-0000-4000-8000-000000000003'::uuid
  ),
  true,
  'the newly shared dashboard is what now spends the allowance'
);

set local role authenticated;

-- Property 1, on the share path: the dashboard that already counts can gain
-- more readers for free. Without the exclusion, a free workspace could share
-- with exactly one person, ever.
select lives_ok(
  $$insert into public.resource_shares
      (id, workspace_id, resource_type, resource_id, principal_type, principal_id, role)
    values (
      'f2004003-0000-4000-8000-000000000003'::uuid,
      'f2001001-0000-4000-8000-000000000001'::uuid,
      'dashboard'::public.resource_type,
      'f2005003-0000-4000-8000-000000000003'::uuid,
      'user'::public.share_principal_type,
      'f2000003-0000-4000-8000-000000000003'::uuid,
      'viewer'::public.role_level
    )$$,
  'a second reader on the dashboard that already counts is allowed'
);

-- The over-cap workspace ------------------------------------------------------

-- Three counting dashboards against a cap of one. Every statement here is
-- narrowing, and every one of them has to work, or a workspace that published
-- freely before this feature existed would be frozen where it stands.

reset role;

select is(
  (
    select count(*)::int
    from public.dashboards d
    where
      d.workspace_id = 'f2001003-0000-4000-8000-000000000003'::uuid and
      public.util__dashboard_counts_as_shareable (d.id)
  ),
  3,
  'the over-cap workspace really starts over its cap of one'
);

set local role authenticated;

select lives_ok(
  $$update public.dashboards
       set visibility = 'draft',
           snapshot_transition_kind = 'unpublish',
           snapshot_transition_revision = 'f2006121-0000-4000-8000-000000000121'::uuid,
           snapshot_transition_prior_revision = snapshot_revision,
           snapshot_transition_prior_visibility = visibility,
           snapshot_transition_target_visibility = null
     where id = 'f2005021-0000-4000-8000-000000000021'::uuid;

    update public.dashboards
       set visibility = 'draft',
           snapshot_revision = null,
           snapshot_transition_kind = null,
           snapshot_transition_revision = null,
           snapshot_transition_prior_revision = null,
           snapshot_transition_prior_visibility = null,
           snapshot_transition_target_visibility = null
     where id = 'f2005021-0000-4000-8000-000000000021'::uuid$$,
  'unpublishing is allowed from a workspace that is already over its cap'
);

select lives_ok(
  $$delete from public.resource_shares
     where id = 'f2004001-0000-4000-8000-000000000001'::uuid$$,
  'deleting a share is allowed from a workspace that is already over its cap'
);

-- `rpc_resources__make_private` deletes the non-owner shares and only then sets
-- `is_restricted`, so by the time the UPDATE reaches the guard the dashboard no
-- longer counts and the guard returns early. That ordering is what keeps
-- "make private" available to an over-cap workspace, and this case is what
-- would notice if it were ever reversed.
select lives_ok(
  $$select public.rpc_resources__make_private (
      'dashboard'::public.resource_type,
      'f2005023-0000-4000-8000-000000000023'::uuid
    )$$,
  'making a counting dashboard private is allowed from an over-cap workspace'
);

reset role;

select is(
  public.util__dashboard_counts_as_shareable (
    'f2005023-0000-4000-8000-000000000023'::uuid
  ),
  false,
  'the dashboard that was made private no longer counts'
);

set local role authenticated;

-- The paid workspace ----------------------------------------------------------

-- A null cap means unlimited, and it has to short-circuit before the count.
select lives_ok(
  $$update public.dashboards
       set snapshot_transition_kind = 'publish',
           snapshot_transition_revision = 'f2006112-0000-4000-8000-000000000112'::uuid,
           snapshot_transition_prior_revision = snapshot_revision,
           snapshot_transition_prior_visibility = visibility,
           snapshot_transition_target_visibility = 'public'
     where id = 'f2005012-0000-4000-8000-000000000012'::uuid;

    update public.dashboards
       set visibility = 'public',
           snapshot_revision = 'f2006112-0000-4000-8000-000000000112'::uuid,
           snapshot_transition_kind = null,
           snapshot_transition_revision = null,
           snapshot_transition_prior_revision = null,
           snapshot_transition_prior_visibility = null,
           snapshot_transition_target_visibility = null
     where id = 'f2005012-0000-4000-8000-000000000012'::uuid$$,
  'a paid workspace with a null cap is unlimited'
);

-- The service-role exemption --------------------------------------------------

-- Trusted server-side paths (edge functions, migrations, backfills) already
-- bypass RLS, and the free workspace is back at its cap here, so this publish
-- would be refused for an end user.
set local role service_role;

select lives_ok(
  $$update public.dashboards
       set snapshot_transition_kind = 'publish',
           snapshot_transition_revision = 'f2006105-0000-4000-8000-000000000105'::uuid,
           snapshot_transition_prior_revision = snapshot_revision,
           snapshot_transition_prior_visibility = visibility,
           snapshot_transition_target_visibility = 'workspace'
     where id = 'f2005002-0000-4000-8000-000000000002'::uuid;

    update public.dashboards
       set visibility = 'workspace',
           snapshot_revision = 'f2006105-0000-4000-8000-000000000105'::uuid,
           snapshot_transition_kind = null,
           snapshot_transition_revision = null,
           snapshot_transition_prior_revision = null,
           snapshot_transition_prior_visibility = null,
           snapshot_transition_target_visibility = null
     where id = 'f2005002-0000-4000-8000-000000000002'::uuid$$,
  'the service role is exempt and can publish past the cap'
);

select is(
  (
    select visibility
    from public.dashboards
    where id = 'f2005002-0000-4000-8000-000000000002'::uuid
  ),
  'workspace'::public.dashboard_visibility,
  'the dashboard the service role published really is published'
);

reset role;

select * from finish();

rollback;
