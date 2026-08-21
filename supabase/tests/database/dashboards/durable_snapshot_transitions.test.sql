\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

select plan(30);

insert into public.dashboards (
  id,
  workspace_id,
  owner_id,
  owner_profile_id,
  name,
  config
)
select
  'f7004001-0000-4000-8000-000000000001'::uuid,
  user_profiles.workspace_id,
  user_profiles.user_id,
  user_profiles.id,
  'transition fence fixture',
  '{}'::jsonb
from public.user_profiles
limit 1;

-- The type, the five transition columns and the two CHECK constraints are not
-- asserted structurally here. Every behavioural case below writes all five
-- columns and names both constraints in its expected error, so a missing
-- column or a dropped constraint fails those instead, with a message that says
-- what actually broke.

select has_schema(
  'private',
  'snapshot policy helpers live in a non-exposed schema'
);

select has_function(
  'private',
  'util__auth_user_can_write_dashboard_snapshot_object',
  array['text', 'text'],
  'snapshot writes use durable publish claims'
);

select is(
  (
    select pg_proc.provolatile
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'private'
      and pg_proc.proname = 'util__auth_user_can_write_dashboard_snapshot_object'
      and pg_proc.pronargs = 2
  ),
  'v'::"char",
  'the write helper is volatile so it may acquire a row lock'
);

select ok(
  not exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where
      pg_namespace.nspname = 'public' and
      pg_proc.proname in (
        'util__auth_user_can_write_dashboard_snapshot_object',
        'util__auth_user_can_delete_dashboard_snapshot_object',
        'util__auth_user_can_modify_dashboard_snapshot_object'
      )
  ),
  'snapshot security-definer policy helpers are absent from public'
);

select ok(
  case
    when to_regprocedure(
      'private.util__auth_user_can_write_dashboard_snapshot_object(text,text)'
    ) is null or to_regprocedure(
      'private.util__auth_user_can_delete_dashboard_snapshot_object(text,text)'
    ) is null then false
    else
      has_function_privilege(
        'authenticated',
        'private.util__auth_user_can_write_dashboard_snapshot_object(text,text)',
        'EXECUTE'
      ) and
      has_function_privilege(
        'authenticated',
        'private.util__auth_user_can_delete_dashboard_snapshot_object(text,text)',
        'EXECUTE'
      )
  end,
  'authenticated may execute the private policy helpers'
);

select ok(
  case
    when to_regprocedure(
      'private.util__auth_user_can_write_dashboard_snapshot_object(text,text)'
    ) is null or to_regprocedure(
      'private.util__auth_user_can_delete_dashboard_snapshot_object(text,text)'
    ) is null then false
    else
      not has_function_privilege(
        'anon',
        'private.util__auth_user_can_write_dashboard_snapshot_object(text,text)',
        'EXECUTE'
      ) and
      not has_function_privilege(
        'anon',
        'private.util__auth_user_can_delete_dashboard_snapshot_object(text,text)',
        'EXECUTE'
      )
  end,
  'anon cannot execute the private policy helpers'
);

select ok(
  case
    when to_regprocedure(
      'private.util__auth_user_can_write_dashboard_snapshot_object(text,text)'
    ) is null or to_regprocedure(
      'private.util__auth_user_can_delete_dashboard_snapshot_object(text,text)'
    ) is null then false
    else
      not has_function_privilege(
        'service_role',
        'private.util__auth_user_can_write_dashboard_snapshot_object(text,text)',
        'EXECUTE'
      ) and
      not has_function_privilege(
        'service_role',
        'private.util__auth_user_can_delete_dashboard_snapshot_object(text,text)',
        'EXECUTE'
      )
  end,
  'service_role cannot execute the private policy helpers'
);

select has_function(
  'private',
  'util__auth_user_can_delete_dashboard_snapshot_object',
  array['text', 'text'],
  'snapshot deletes retain durable cleanup authority'
);

-- Which helper the six snapshot mutation policies call is not asserted by
-- matching their source text: that passes even when the helper is handed
-- swapped or negated arguments. `storage_published_buckets`,
-- `storage_published_visibility_guard` and `storage_snapshot_generations`
-- exercise those policies against real objects instead.

select ok(
  exists (
    select 1
    from pg_trigger
    join pg_class on pg_class.oid = pg_trigger.tgrelid
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where
      pg_namespace.nspname = 'public' and
      pg_class.relname = 'dashboards' and
      pg_trigger.tgname = 'tr__dashboards__validate_snapshot_transition_update'
  ),
  'dashboard updates are fenced by the snapshot transition trigger'
);

select ok(
  case
    when to_regprocedure(
      'private.dashboards__validate_snapshot_transition_update()'
    ) is null then false
    else
      not has_function_privilege(
        'anon',
        'private.dashboards__validate_snapshot_transition_update()',
        'EXECUTE'
      ) and
      not has_function_privilege(
        'authenticated',
        'private.dashboards__validate_snapshot_transition_update()',
        'EXECUTE'
      ) and
      not has_function_privilege(
        'service_role',
        'private.dashboards__validate_snapshot_transition_update()',
        'EXECUTE'
      )
  end,
  'API roles cannot execute the private transition trigger function'
);

select throws_ok(
  $$update public.dashboards
    set
      visibility = 'public'::public.dashboard_visibility,
      snapshot_revision = 'f7005001-0000-4000-8000-000000000001'::uuid
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid$$,
  '23514',
  'illegal dashboard snapshot transition',
  'a settled dashboard cannot move directly to another reader boundary'
);

select lives_ok(
  $$update public.dashboards
    set
      snapshot_transition_kind = 'publish',
      snapshot_transition_revision = 'f7005001-0000-4000-8000-000000000001'::uuid,
      snapshot_transition_prior_revision = snapshot_revision,
      snapshot_transition_prior_visibility = visibility,
      snapshot_transition_target_visibility = 'public'
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid$$,
  'a settled dashboard may acquire a publish claim'
);

select lives_ok(
  $$update public.dashboards
    set snapshot_transition_revision =
      'f7005001-0000-4000-8000-000000000001'::uuid
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid$$,
  'a transition heartbeat may preserve its claim token'
);

select lives_ok(
  $$update public.dashboards
    set snapshot_transition_kind = 'abort_publish'
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid;

    update public.dashboards
    set
      snapshot_transition_kind = null,
      snapshot_transition_revision = null,
      snapshot_transition_prior_revision = null,
      snapshot_transition_prior_visibility = null,
      snapshot_transition_target_visibility = null
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid$$,
  'publish recovery may fence and clear an aborted claim'
);

select lives_ok(
  $$update public.dashboards
    set
      snapshot_transition_kind = 'publish',
      snapshot_transition_revision = 'f7005002-0000-4000-8000-000000000002'::uuid,
      snapshot_transition_prior_revision = snapshot_revision,
      snapshot_transition_prior_visibility = visibility,
      snapshot_transition_target_visibility = 'public'
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid;

    update public.dashboards
    set
      visibility = 'public'::public.dashboard_visibility,
      snapshot_revision = 'f7005002-0000-4000-8000-000000000002'::uuid,
      snapshot_transition_kind = null,
      snapshot_transition_revision = null,
      snapshot_transition_prior_revision = null,
      snapshot_transition_prior_visibility = null,
      snapshot_transition_target_visibility = null
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid$$,
  'a publish claim may commit its staged revision and audience'
);

select throws_ok(
  $$update public.dashboards
    set snapshot_revision =
      'f7005999-0000-4000-8000-000000000999'::uuid
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid$$,
  '23514',
  'illegal dashboard snapshot transition',
  'a settled published dashboard cannot replace its committed generation directly'
);

select lives_ok(
  $$update public.dashboards
    set
      visibility = 'draft'::public.dashboard_visibility,
      snapshot_transition_kind = 'unpublish',
      snapshot_transition_revision = 'f7005003-0000-4000-8000-000000000003'::uuid,
      snapshot_transition_prior_revision = snapshot_revision,
      snapshot_transition_prior_visibility = visibility
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid;

    update public.dashboards
    set snapshot_transition_revision =
      'f7005003-0000-4000-8000-000000000003'::uuid
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid;

    update public.dashboards
    set
      snapshot_revision = null,
      snapshot_transition_kind = null,
      snapshot_transition_revision = null,
      snapshot_transition_prior_revision = null,
      snapshot_transition_prior_visibility = null,
      snapshot_transition_target_visibility = null
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid$$,
  'cleanup recovery may heartbeat and settle a draft without a snapshot'
);

-- A `delete` claim is not terminal. Its whole point is that the row is about to
-- disappear, but a crashed client or a storage cleanup that cannot finish would
-- otherwise pin the row forever: the update trigger has no caller exemption, so
-- a `delete` with no settlement arm could not be cleared by `service_role` or
-- by a repair migration either. These four cases pin the escape hatch and its
-- shape.

select lives_ok(
  $$update public.dashboards
    set
      snapshot_transition_kind = 'publish',
      snapshot_transition_revision = 'f7005004-0000-4000-8000-000000000004'::uuid,
      snapshot_transition_prior_revision = snapshot_revision,
      snapshot_transition_prior_visibility = visibility,
      snapshot_transition_target_visibility = 'workspace'
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid;

    update public.dashboards
    set
      visibility = 'workspace'::public.dashboard_visibility,
      snapshot_revision = 'f7005004-0000-4000-8000-000000000004'::uuid,
      snapshot_transition_kind = null,
      snapshot_transition_revision = null,
      snapshot_transition_prior_revision = null,
      snapshot_transition_prior_visibility = null,
      snapshot_transition_target_visibility = null
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid$$,
  'the fixture republishes to workspace so a delete claim has a boundary to lose'
);

select lives_ok(
  $$update public.dashboards
    set
      visibility = 'draft'::public.dashboard_visibility,
      snapshot_transition_kind = 'delete',
      snapshot_transition_revision = 'f7005005-0000-4000-8000-000000000005'::uuid,
      snapshot_transition_prior_revision = snapshot_revision,
      snapshot_transition_prior_visibility = visibility
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid$$,
  'a published dashboard may acquire a delete claim'
);

select throws_ok(
  $$update public.dashboards
    set
      visibility = snapshot_transition_prior_visibility,
      snapshot_revision = snapshot_transition_prior_revision,
      snapshot_transition_kind = null,
      snapshot_transition_revision = null,
      snapshot_transition_prior_revision = null,
      snapshot_transition_prior_visibility = null,
      snapshot_transition_target_visibility = null
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid$$,
  '23514',
  'illegal dashboard snapshot transition',
  'abandoning a delete cannot restore the audience whose objects it may have destroyed'
);

select lives_ok(
  $$update public.dashboards
    set
      snapshot_revision = null,
      snapshot_transition_kind = null,
      snapshot_transition_revision = null,
      snapshot_transition_prior_revision = null,
      snapshot_transition_prior_visibility = null,
      snapshot_transition_target_visibility = null
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid$$,
  'an abandoned delete settles to a draft with no snapshot, like an unpublish'
);

select lives_ok(
  $$update public.dashboards
    set
      snapshot_transition_kind = 'publish',
      snapshot_transition_revision = 'f7005006-0000-4000-8000-000000000006'::uuid,
      snapshot_transition_prior_revision = snapshot_revision,
      snapshot_transition_prior_visibility = visibility,
      snapshot_transition_target_visibility = 'public'
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid;

    update public.dashboards
    set
      visibility = 'public'::public.dashboard_visibility,
      snapshot_revision = 'f7005006-0000-4000-8000-000000000006'::uuid,
      snapshot_transition_kind = null,
      snapshot_transition_revision = null,
      snapshot_transition_prior_revision = null,
      snapshot_transition_prior_visibility = null,
      snapshot_transition_target_visibility = null
    where id = 'f7004001-0000-4000-8000-000000000001'::uuid$$,
  'a dashboard whose delete was abandoned is publishable again, not stuck'
);

select throws_ok(
  $$insert into public.dashboards (
      workspace_id, owner_id, owner_profile_id, name, config,
      snapshot_transition_kind
    )
    select
      user_profiles.workspace_id,
      user_profiles.user_id,
      user_profiles.id,
      'invalid transition',
      '{}'::jsonb,
      'publish'::public.dashboard_snapshot_transition_kind
    from public.user_profiles
    limit 1$$,
  '23514',
  'new row for relation "dashboards" violates check constraint "dashboards__snapshot_transition_consistent"',
  'partial transition states are rejected'
);

select throws_ok(
  $$insert into public.dashboards (
      workspace_id, owner_id, owner_profile_id, name, config, visibility,
      snapshot_transition_kind, snapshot_transition_revision,
      snapshot_transition_prior_visibility
    )
    select
      user_profiles.workspace_id,
      user_profiles.user_id,
      user_profiles.id,
      'published cleanup claim',
      '{}'::jsonb,
      'public'::public.dashboard_visibility,
      'unpublish'::public.dashboard_snapshot_transition_kind,
      gen_random_uuid(),
      'public'::public.dashboard_visibility
    from public.user_profiles
    limit 1$$,
  '23514',
  'new row for relation "dashboards" violates check constraint "dashboards__snapshot_transition_consistent"',
  'cleanup claims must revoke published visibility'
);

select throws_ok(
  $$insert into public.dashboards (
      workspace_id, owner_id, owner_profile_id, name, config, visibility,
      snapshot_transition_kind, snapshot_transition_revision,
      snapshot_transition_prior_visibility,
      snapshot_transition_target_visibility
    )
    select
      user_profiles.workspace_id,
      user_profiles.user_id,
      user_profiles.id,
      'publish boundary mismatch',
      '{}'::jsonb,
      'draft'::public.dashboard_visibility,
      'publish'::public.dashboard_snapshot_transition_kind,
      gen_random_uuid(),
      'public'::public.dashboard_visibility,
      'public'::public.dashboard_visibility
    from public.user_profiles
    limit 1$$,
  '23514',
  'new row for relation "dashboards" violates check constraint "dashboards__snapshot_transition_consistent"',
  'publish claims must preserve the prior audience boundary'
);

select throws_ok(
  $$insert into public.dashboards (
      workspace_id, owner_id, owner_profile_id, name, config, visibility,
      snapshot_revision, snapshot_transition_kind,
      snapshot_transition_revision, snapshot_transition_prior_revision,
      snapshot_transition_prior_visibility,
      snapshot_transition_target_visibility
    )
    select
      user_profiles.workspace_id,
      user_profiles.user_id,
      user_profiles.id,
      'publish reuses committed revision',
      '{}'::jsonb,
      'public'::public.dashboard_visibility,
      'f7005998-0000-4000-8000-000000000998'::uuid,
      'publish'::public.dashboard_snapshot_transition_kind,
      'f7005998-0000-4000-8000-000000000998'::uuid,
      'f7005998-0000-4000-8000-000000000998'::uuid,
      'public'::public.dashboard_visibility,
      'public'::public.dashboard_visibility
    from public.user_profiles
    limit 1$$,
  '23514',
  'new row for relation "dashboards" violates check constraint "dashboards__snapshot_transition_consistent"',
  'a transition revision cannot reuse the committed snapshot revision'
);

select throws_ok(
  $$insert into public.dashboards (
      workspace_id, owner_id, owner_profile_id, name, config,
      snapshot_transition_kind, snapshot_transition_revision,
      snapshot_transition_prior_visibility,
      snapshot_transition_target_visibility
    )
    select
      user_profiles.workspace_id,
      user_profiles.user_id,
      user_profiles.id,
      'publish uses legacy sentinel',
      '{}'::jsonb,
      'publish'::public.dashboard_snapshot_transition_kind,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'draft'::public.dashboard_visibility,
      'public'::public.dashboard_visibility
    from public.user_profiles
    limit 1$$,
  '23514',
  'new row for relation "dashboards" violates check constraint "dashboards__snapshot_transition_consistent"',
  'a transition revision cannot use the reserved legacy sentinel'
);

select throws_ok(
  $$insert into public.dashboards (
      workspace_id, owner_id, owner_profile_id, name, config, visibility,
      snapshot_revision
    )
    select
      user_profiles.workspace_id,
      user_profiles.user_id,
      user_profiles.id,
      'settled draft with revision',
      '{}'::jsonb,
      'draft'::public.dashboard_visibility,
      gen_random_uuid()
    from public.user_profiles
    limit 1$$,
  '23514',
  'new row for relation "dashboards" violates check constraint "dashboards__settled_snapshot_consistent"',
  'a settled draft cannot retain a snapshot revision'
);

select throws_ok(
  $$insert into public.dashboards (
      workspace_id, owner_id, owner_profile_id, name, config, visibility
    )
    select
      user_profiles.workspace_id,
      user_profiles.user_id,
      user_profiles.id,
      'settled workspace dashboard without revision',
      '{}'::jsonb,
      'workspace'::public.dashboard_visibility
    from public.user_profiles
    limit 1$$,
  '23514',
  'new row for relation "dashboards" violates check constraint "dashboards__settled_snapshot_consistent"',
  'a settled workspace dashboard requires a snapshot revision'
);

select throws_ok(
  $$insert into public.dashboards (
      workspace_id, owner_id, owner_profile_id, name, config, visibility
    )
    select
      user_profiles.workspace_id,
      user_profiles.user_id,
      user_profiles.id,
      'settled public dashboard without revision',
      '{}'::jsonb,
      'public'::public.dashboard_visibility
    from public.user_profiles
    limit 1$$,
  '23514',
  'new row for relation "dashboards" violates check constraint "dashboards__settled_snapshot_consistent"',
  'a settled public dashboard requires a snapshot revision'
);

select * from finish();

rollback;
