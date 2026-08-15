\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

select plan(34);

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

select has_type(
  'public',
  'dashboard_snapshot_transition_kind',
  'dashboard snapshot transition kind is durable'
);

select has_column('public', 'dashboards', 'snapshot_transition_kind', 'has transition kind');
select has_column('public', 'dashboards', 'snapshot_transition_revision', 'has transition revision');
select has_column('public', 'dashboards', 'snapshot_transition_prior_revision', 'has prior revision');
select has_column('public', 'dashboards', 'snapshot_transition_prior_visibility', 'has prior visibility');
select has_column('public', 'dashboards', 'snapshot_transition_target_visibility', 'has target visibility');

select has_check(
  'public',
  'dashboards',
  'dashboards has a transition state consistency check'
);

select has_check(
  'public',
  'dashboards',
  'dashboards has a settled snapshot consistency check'
);

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

select is(
  (
    select count(*)::integer
    from pg_policies
    where
      schemaname = 'storage' and
      tablename = 'objects' and
      policyname in (
        'Authenticated users can DELETE published datasets',
        'Authenticated users can UPDATE published datasets',
        'Authenticated users can UPLOAD published datasets',
        'Users can DELETE private published datasets',
        'Users can UPDATE private published datasets',
        'Users can UPLOAD private published datasets'
      ) and
      coalesce(qual, '') || coalesce(with_check, '') like
        '%private.util__auth_user_can_%dashboard_snapshot_object%'
  ),
  6,
  'snapshot mutation policies qualify private helper calls'
);

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
