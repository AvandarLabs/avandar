\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- Snapshot objects are named
-- `dashboards/<dashboardId>/revisions/<revision>/datasets/<datasetId>.parquet`
-- in both snapshot buckets. `util__storage_object_dashboard_id` is what the
-- storage policies use to get from an object name back to the dashboard whose
-- access rules apply. It returns null rather than raising on a path it does not
-- recognise, so a malformed name is a policy DENIAL instead of a storage error.
--
select plan(61);

select is(
  public.util__storage_object_dashboard_id (
    'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007001-0000-4000-8000-000000000001.parquet'
  ),
  'd2004001-0000-4000-8000-000000000001'::uuid,
  'extracts the dashboard id from a real snapshot path'
);

select is(
  public.util__storage_object_dashboard_id (
    'workspaces/d2004001-0000-4000-8000-000000000001/datasets/x.parquet'
  ),
  null::uuid,
  'returns null when the prefix is not `dashboards`'
);

select is(
  public.util__storage_object_dashboard_id (
    'dashboards/d2004001-0000-4000-8000-000000000001/exports/x.parquet'
  ),
  null::uuid,
  'returns null when the third segment is not `datasets`'
);

select is(
  public.util__storage_object_dashboard_id (
    'dashboards/not-a-uuid/datasets/x.parquet'
  ),
  null::uuid,
  'returns null rather than raising when the id segment is not a uuid'
);

select is(
  public.util__storage_object_dashboard_id (''),
  null::uuid,
  'returns null on an empty object name'
);

-- The policy boundary ------------------------------------------------------
--
-- storage.objects is an ordinary RLS-protected table, so the policies are
-- testable here directly (the same approach as
-- permissions/storage_private_dataset_guard.test.sql).
--
-- NOTE what this does NOT prove: that `published-private` is actually a
-- private bucket. A bucket created with `public = true` is served through a
-- path that never consults storage.objects RLS at all, so these assertions
-- would still pass. tests/e2e/dashboard-private-snapshot-bucket.spec.ts must
-- cover that over real HTTP.
--
insert into auth.users (id, email, aud, role)
values
  ('d2000001-0000-4000-8000-000000000001'::uuid, 'd2_owner@test.dev', 'authenticated', 'authenticated'),
  ('d2000002-0000-4000-8000-000000000002'::uuid, 'd2_shared@test.dev', 'authenticated', 'authenticated'),
  ('d2000003-0000-4000-8000-000000000003'::uuid, 'd2_member@test.dev', 'authenticated', 'authenticated'),
  ('d2000004-0000-4000-8000-000000000004'::uuid, 'd2_editor@test.dev', 'authenticated', 'authenticated'),
  ('d2000005-0000-4000-8000-000000000005'::uuid, 'd2_cross_workspace@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values
  (
    'd2001001-0000-4000-8000-000000000001'::uuid,
    'd2000001-0000-4000-8000-000000000001'::uuid,
    'd2 workspace',
    'd2-storage-ws'
  ),
  (
    'd2001002-0000-4000-8000-000000000002'::uuid,
    'd2000005-0000-4000-8000-000000000005'::uuid,
    'd2 cross workspace',
    'd2-storage-cross-ws'
  );

insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('d200cf01-0000-4000-8000-000000000001'::uuid, 'd2001001-0000-4000-8000-000000000001'::uuid, 'd2 dashboards editor', false),
  ('d200cf02-0000-4000-8000-000000000002'::uuid, 'd2001002-0000-4000-8000-000000000002'::uuid, 'd2 cross dashboards editor', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('d200cf01-0000-4000-8000-000000000001'::uuid, 'dashboards'::public.app_type, 'editor'::public.role_level),
  ('d200cf02-0000-4000-8000-000000000002'::uuid, 'dashboards'::public.app_type, 'editor'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('d2002001-0000-4000-8000-000000000001'::uuid, 'd2001001-0000-4000-8000-000000000001'::uuid, 'd2000001-0000-4000-8000-000000000001'::uuid, 'd200cf01-0000-4000-8000-000000000001'::uuid),
  ('d2002002-0000-4000-8000-000000000002'::uuid, 'd2001001-0000-4000-8000-000000000001'::uuid, 'd2000002-0000-4000-8000-000000000002'::uuid, 'd200cf01-0000-4000-8000-000000000001'::uuid),
  ('d2002003-0000-4000-8000-000000000003'::uuid, 'd2001001-0000-4000-8000-000000000001'::uuid, 'd2000003-0000-4000-8000-000000000003'::uuid, 'd200cf01-0000-4000-8000-000000000001'::uuid),
  ('d2002004-0000-4000-8000-000000000004'::uuid, 'd2001001-0000-4000-8000-000000000001'::uuid, 'd2000004-0000-4000-8000-000000000004'::uuid, 'd200cf01-0000-4000-8000-000000000001'::uuid),
  ('d2002005-0000-4000-8000-000000000005'::uuid, 'd2001002-0000-4000-8000-000000000002'::uuid, 'd2000005-0000-4000-8000-000000000005'::uuid, 'd200cf02-0000-4000-8000-000000000002'::uuid);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('d2003001-0000-4000-8000-000000000001'::uuid, 'd2000001-0000-4000-8000-000000000001'::uuid, 'd2001001-0000-4000-8000-000000000001'::uuid, 'd2002001-0000-4000-8000-000000000001'::uuid, 'D2 Owner', 'D2 Owner'),
  ('d2003002-0000-4000-8000-000000000002'::uuid, 'd2000002-0000-4000-8000-000000000002'::uuid, 'd2001001-0000-4000-8000-000000000001'::uuid, 'd2002002-0000-4000-8000-000000000002'::uuid, 'D2 Shared', 'D2 Shared'),
  ('d2003003-0000-4000-8000-000000000003'::uuid, 'd2000003-0000-4000-8000-000000000003'::uuid, 'd2001001-0000-4000-8000-000000000001'::uuid, 'd2002003-0000-4000-8000-000000000003'::uuid, 'D2 Member', 'D2 Member'),
  ('d2003005-0000-4000-8000-000000000005'::uuid, 'd2000005-0000-4000-8000-000000000005'::uuid, 'd2001002-0000-4000-8000-000000000002'::uuid, 'd2002005-0000-4000-8000-000000000005'::uuid, 'D2 Cross Workspace', 'D2 Cross Workspace');

-- A workspace-published dashboard, restricted, shared with d2000002 only.
insert into public.dashboards (
  id, workspace_id, owner_id, owner_profile_id, name, config, visibility,
  is_restricted, snapshot_revision
)
values
  (
    'd2004001-0000-4000-8000-000000000001'::uuid,
    'd2001001-0000-4000-8000-000000000001'::uuid,
    'd2000001-0000-4000-8000-000000000001'::uuid,
    'd2003001-0000-4000-8000-000000000001'::uuid,
    'd2 internal dashboard',
    '{}'::jsonb,
    'workspace'::public.dashboard_visibility,
    true,
    '11111111-1111-4111-8111-111111111111'::uuid
  ),
  (
    'd2004002-0000-4000-8000-000000000002'::uuid,
    'd2001001-0000-4000-8000-000000000001'::uuid,
    'd2000003-0000-4000-8000-000000000003'::uuid,
    'd2003003-0000-4000-8000-000000000003'::uuid,
    'd2 editor forbidden dashboard',
    '{}'::jsonb,
    'workspace'::public.dashboard_visibility,
    true,
    '11111111-1111-4111-8111-111111111111'::uuid
  ),
  (
    'd2004003-0000-4000-8000-000000000003'::uuid,
    'd2001002-0000-4000-8000-000000000002'::uuid,
    'd2000005-0000-4000-8000-000000000005'::uuid,
    'd2003005-0000-4000-8000-000000000005'::uuid,
    'd2 cross workspace dashboard',
    '{}'::jsonb,
    'workspace'::public.dashboard_visibility,
    true,
    '11111111-1111-4111-8111-111111111111'::uuid
  ),
  (
    'd2004004-0000-4000-8000-000000000004'::uuid,
    'd2001001-0000-4000-8000-000000000001'::uuid,
    'd2000001-0000-4000-8000-000000000001'::uuid,
    'd2003001-0000-4000-8000-000000000001'::uuid,
    'd2 public dashboard',
    '{}'::jsonb,
    'public'::public.dashboard_visibility,
    true,
    '11111111-1111-4111-8111-111111111111'::uuid
  ),
  (
    'd2004005-0000-4000-8000-000000000005'::uuid,
    'd2001001-0000-4000-8000-000000000001'::uuid,
    'd2000001-0000-4000-8000-000000000001'::uuid,
    'd2003001-0000-4000-8000-000000000001'::uuid,
    'd2 unrestricted workspace dashboard',
    '{}'::jsonb,
    'workspace'::public.dashboard_visibility,
    false,
    '11111111-1111-4111-8111-111111111111'::uuid
  );

insert into public.resource_shares (
  resource_type, resource_id, workspace_id, principal_type, principal_id, role
)
values
  (
    'dashboard'::public.resource_type,
    'd2004001-0000-4000-8000-000000000001'::uuid,
    'd2001001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    'd2000002-0000-4000-8000-000000000002'::uuid,
    'viewer'::public.role_level
  ),
  (
    'dashboard'::public.resource_type,
    'd2004001-0000-4000-8000-000000000001'::uuid,
    'd2001001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    'd2000004-0000-4000-8000-000000000004'::uuid,
    'editor'::public.role_level
  ),
  (
    'dashboard'::public.resource_type,
    'd2004004-0000-4000-8000-000000000004'::uuid,
    'd2001001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    'd2000002-0000-4000-8000-000000000002'::uuid,
    'viewer'::public.role_level
  ),
  (
    'dashboard'::public.resource_type,
    'd2004004-0000-4000-8000-000000000004'::uuid,
    'd2001001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    'd2000004-0000-4000-8000-000000000004'::uuid,
    'editor'::public.role_level
  );

insert into storage.buckets (id, name, public)
values
  ('published', 'published', true),
  ('published-private', 'published-private', false)
on conflict (id) do nothing;

insert into storage.objects (bucket_id, name, owner)
values
  (
    'published-private',
    'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007001-0000-4000-8000-000000000001.parquet',
    'd2000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published',
    'dashboards/d2004004-0000-4000-8000-000000000004/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007011-0000-4000-8000-000000000011.parquet',
    'd2000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published-private',
    'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007012-0000-4000-8000-000000000012.parquet',
    'd2000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published-private',
    'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007013-0000-4000-8000-000000000013.parquet',
    'd2000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published',
    'dashboards/d2004004-0000-4000-8000-000000000004/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007014-0000-4000-8000-000000000014.parquet',
    'd2000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published',
    'dashboards/d2004004-0000-4000-8000-000000000004/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007015-0000-4000-8000-000000000015.parquet',
    'd2000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published-private',
    'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007016-0000-4000-8000-000000000016.parquet',
    'd2000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published',
    'dashboards/d2004004-0000-4000-8000-000000000004/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007017-0000-4000-8000-000000000017.parquet',
    'd2000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published-private',
    'dashboards/d2004004-0000-4000-8000-000000000004/revisions/33333333-3333-4333-8333-333333333333/datasets/d2007018-0000-4000-8000-000000000018.parquet',
    'd2000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published-private',
    'dashboards/d2004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007026-0000-4000-8000-000000000026.parquet',
    'd2000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published-private',
    'dashboards/d2004005-0000-4000-8000-000000000005/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007034-0000-4000-8000-000000000034.parquet',
    'd2000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published-private',
    'dashboards/d2004005-0000-4000-8000-000000000005/revisions/55555555-5555-4555-8555-555555555555/datasets/d2007035-0000-4000-8000-000000000035.parquet',
    'd2000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published',
    'dashboards/d2004005-0000-4000-8000-000000000005/revisions/55555555-5555-4555-8555-555555555555/datasets/d2007036-0000-4000-8000-000000000036.parquet',
    'd2000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published',
    'dashboards/d2004004-0000-4000-8000-000000000004/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007027-0000-4000-8000-000000000027.parquet',
    'd2000001-0000-4000-8000-000000000001'::uuid
  );

update public.dashboards
set
  snapshot_transition_kind = 'publish',
  snapshot_transition_revision = '22222222-2222-4222-8222-222222222222',
  snapshot_transition_prior_revision = snapshot_revision,
  snapshot_transition_prior_visibility = visibility,
  snapshot_transition_target_visibility = case
    when id = 'd2004001-0000-4000-8000-000000000001'::uuid
      then 'workspace'::public.dashboard_visibility
    else 'public'::public.dashboard_visibility
  end
where id in (
  'd2004001-0000-4000-8000-000000000001'::uuid,
  'd2004004-0000-4000-8000-000000000004'::uuid
);

-- A member with no share cannot read the private snapshot -------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000003-0000-4000-8000-000000000003"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published-private'
  ),
  0,
  'a workspace member with no share cannot see a published-private object'
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004005-0000-4000-8000-000000000005/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007034-0000-4000-8000-000000000034.parquet'
  ),
  0,
  'a Global Editor without a share cannot read an unrestricted committed snapshot'
);

reset role;

update public.dashboards
set
  snapshot_transition_kind = 'publish',
  snapshot_transition_revision = '55555555-5555-4555-8555-555555555555'::uuid,
  snapshot_transition_prior_revision = snapshot_revision,
  snapshot_transition_prior_visibility = visibility,
  snapshot_transition_target_visibility = 'workspace'
where id = 'd2004005-0000-4000-8000-000000000005'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000003-0000-4000-8000-000000000003"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004005-0000-4000-8000-000000000005/revisions/55555555-5555-4555-8555-555555555555/datasets/d2007035-0000-4000-8000-000000000035.parquet'
  ),
  0,
  'an unshared Global Editor cannot read an exact staged private snapshot'
);

reset role;

update public.dashboards
set
  snapshot_transition_kind = 'abort_publish'
where id = 'd2004005-0000-4000-8000-000000000005'::uuid;

update public.dashboards
set
  snapshot_transition_kind = null,
  snapshot_transition_revision = null,
  snapshot_transition_prior_revision = null,
  snapshot_transition_prior_visibility = null,
  snapshot_transition_target_visibility = null
where id = 'd2004005-0000-4000-8000-000000000005'::uuid;

update public.dashboards
set
  snapshot_transition_kind = 'publish',
  snapshot_transition_revision = '55555555-5555-4555-8555-555555555555'::uuid,
  snapshot_transition_prior_revision = snapshot_revision,
  snapshot_transition_prior_visibility = visibility,
  snapshot_transition_target_visibility = 'public'
where id = 'd2004005-0000-4000-8000-000000000005'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000003-0000-4000-8000-000000000003"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name = 'dashboards/d2004005-0000-4000-8000-000000000005/revisions/55555555-5555-4555-8555-555555555555/datasets/d2007036-0000-4000-8000-000000000036.parquet'
  ),
  0,
  'an unshared Global Editor cannot read an exact staged public snapshot'
);

reset role;

update public.dashboards
set
  snapshot_transition_kind = 'abort_publish'
where id = 'd2004005-0000-4000-8000-000000000005'::uuid;

update public.dashboards
set
  snapshot_transition_kind = null,
  snapshot_transition_revision = null,
  snapshot_transition_prior_revision = null,
  snapshot_transition_prior_visibility = null,
  snapshot_transition_target_visibility = null
where id = 'd2004005-0000-4000-8000-000000000005'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000003-0000-4000-8000-000000000003"}',
  true
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published-private',
      'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007002-0000-4000-8000-000000000002.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a member with no share cannot write into the private bucket'
);

-- ...but a member with a viewer share can read it --------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007001-0000-4000-8000-000000000001.parquet'
  ),
  1,
  'a member with a viewer share can see the published-private object'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published-private',
      'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007003-0000-4000-8000-000000000003.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a viewer share grants read but not write on the private bucket'
);

-- The dashboard owner can write and delete ---------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000001-0000-4000-8000-000000000001"}',
  true
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published-private',
      'dashboards/d2004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007004-0000-4000-8000-000000000004.parquet'
    )$$,
  'the dashboard owner can write into the private bucket'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published',
      'dashboards/d2004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007028-0000-4000-8000-000000000028.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a workspace publish claim cannot write into the public bucket'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published-private',
      'dashboards/d2004004-0000-4000-8000-000000000004/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007029-0000-4000-8000-000000000029.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a public publish claim cannot write into the private bucket'
);

-- The Storage API sets this transaction-local flag before deleting objects.
select set_config('storage.allow_delete_query', 'true', true);

-- Control first. A DELETE returning zero rows only proves the DELETE policy if
-- the row is visible to this session at this moment; without this, a row the
-- SELECT policy hides would produce the same empty result.
select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007004-0000-4000-8000-000000000004.parquet'
  ),
  1,
  'the owner can see the staged private object it is about to fail to delete'
);

select results_eq(
  $$delete from storage.objects
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007004-0000-4000-8000-000000000004.parquet'
    returning name$$,
  array[]::text[],
  'active publish denies deletion of its staged private object'
);

-- Published-bucket writes require dashboard edit access --------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000003-0000-4000-8000-000000000003"}',
  true
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published',
      'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007005-0000-4000-8000-000000000005.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a non-editor cannot overwrite another dashboard''s public snapshot'
);

-- Anonymous users cannot read the private bucket ---------------------------

set local role anon;

select set_config(
  'request.jwt.claims',
  '{"role":"anon"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published-private'
  ),
  0,
  'an anonymous user cannot see published-private objects'
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007011-0000-4000-8000-000000000011.parquet'
  ),
  1,
  'an anonymous user can see a published object'
);

-- An unshared member cannot UPDATE either bucket ---------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000003-0000-4000-8000-000000000003"}',
  true
);

select results_eq(
  $$update storage.objects
    set metadata = '{"attempted_by":"unshared_member"}'::jsonb
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007001-0000-4000-8000-000000000001.parquet'
    returning name$$,
  array[]::text[],
  'an unshared member cannot update a published-private object'
);

select results_eq(
  $$update storage.objects
    set metadata = '{"attempted_by":"unshared_member"}'::jsonb
    where bucket_id = 'published'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007011-0000-4000-8000-000000000011.parquet'
    returning name$$,
  array[]::text[],
  'an unshared member cannot update a published object'
);

-- A non-owner editor can INSERT and UPDATE in the private bucket -----------

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000004-0000-4000-8000-000000000004"}',
  true
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published-private',
      'dashboards/d2004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007020-0000-4000-8000-000000000020.parquet'
    )$$,
  'a non-owner editor can insert a published-private object'
);

select results_eq(
  $$update storage.objects
    set name = 'dashboards/d2004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007021-0000-4000-8000-000000000021.parquet'
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007020-0000-4000-8000-000000000020.parquet'
    returning name$$,
  array[
    'dashboards/d2004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007021-0000-4000-8000-000000000021.parquet'
  ]::text[],
  'a non-owner editor can update a published-private object'
);

select results_eq(
  $$delete from storage.objects
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007021-0000-4000-8000-000000000021.parquet'
    returning name$$,
  array[]::text[],
  'active publish denies an editor deleting its staged private object'
);

-- ...but the world-readable bucket is admin-only ---------------------------
--
-- The transition trigger already gates the DECISION to expose a dashboard
-- publicly. These assertions gate the CONTENT: an editor holding only an editor
-- share must not be able to fill an admin's open public claim with its own
-- bytes.

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published',
      'dashboards/d2004004-0000-4000-8000-000000000004/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007022-0000-4000-8000-000000000022.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a non-owner editor cannot insert a published object'
);

-- Control first. An UPDATE returning zero rows only proves the UPDATE policy if
-- the row is visible to this session at this moment, and the SELECT proof for
-- it sits hundreds of lines away behind several claim-state mutations.
select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007027-0000-4000-8000-000000000027.parquet'
  ),
  1,
  'the editor can see the staged public object it is about to fail to update'
);

select results_eq(
  $$update storage.objects
    set metadata = '{"attempted_by":"editor"}'::jsonb
    where bucket_id = 'published'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007027-0000-4000-8000-000000000027.parquet'
    returning name$$,
  array[]::text[],
  'a non-owner editor cannot update a published object'
);

-- The workspace owner clears the dashboards admin bar, so the same two writes
-- succeed for it and leave the staged object the later sections operate on.

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000001-0000-4000-8000-000000000001"}',
  true
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published',
      'dashboards/d2004004-0000-4000-8000-000000000004/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007022-0000-4000-8000-000000000022.parquet'
    )$$,
  'a dashboards admin can insert a published object'
);

select results_eq(
  $$update storage.objects
    set name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007023-0000-4000-8000-000000000023.parquet'
    where bucket_id = 'published'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007022-0000-4000-8000-000000000022.parquet'
    returning name$$,
  array[
    'dashboards/d2004004-0000-4000-8000-000000000004/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007023-0000-4000-8000-000000000023.parquet'
  ]::text[],
  'a dashboards admin can update a published object'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000004-0000-4000-8000-000000000004"}',
  true
);

select results_eq(
  $$delete from storage.objects
    where bucket_id = 'published'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007023-0000-4000-8000-000000000023.parquet'
    returning name$$,
  array[]::text[],
  'active publish denies an editor deleting its staged public object'
);

-- A member of another workspace cannot read or write these snapshots -------

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000005-0000-4000-8000-000000000005"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published-private'
  ),
  0,
  'a cross-workspace editor cannot see published-private objects'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published-private',
      'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007024-0000-4000-8000-000000000024.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a cross-workspace editor cannot insert a published-private object'
);

select results_eq(
  $$update storage.objects
    set metadata = '{"attempted_by":"cross_workspace_editor"}'::jsonb
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007001-0000-4000-8000-000000000001.parquet'
    returning name$$,
  array[]::text[],
  'a cross-workspace editor cannot update a published-private object'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published',
      'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007025-0000-4000-8000-000000000025.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a cross-workspace editor cannot insert a published object'
);

select results_eq(
  $$update storage.objects
    set metadata = '{"attempted_by":"cross_workspace_editor"}'::jsonb
    where bucket_id = 'published'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007011-0000-4000-8000-000000000011.parquet'
    returning name$$,
  array[]::text[],
  'a cross-workspace editor cannot update a published object'
);

-- UPDATE WITH CHECK rejects moving an editable object to a hidden dashboard -

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000004-0000-4000-8000-000000000004"}',
  true
);

select throws_ok(
  $$update storage.objects
    set name = 'dashboards/d2004002-0000-4000-8000-000000000002/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007030-0000-4000-8000-000000000030.parquet'
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007026-0000-4000-8000-000000000026.parquet'$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a private object cannot be moved to a dashboard the editor cannot update'
);

select throws_ok(
  $$update storage.objects
    set name = 'dashboards/d2004003-0000-4000-8000-000000000003/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007032-0000-4000-8000-000000000032.parquet'
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007026-0000-4000-8000-000000000026.parquet'$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a private object cannot be moved into another workspace'
);

-- The public-bucket halves run as the workspace owner. An editor no longer
-- passes the USING half on `published` at all, so its move would silently match
-- zero rows and prove nothing about WITH CHECK.

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000001-0000-4000-8000-000000000001"}',
  true
);

select throws_ok(
  $$update storage.objects
    set name = 'dashboards/d2004002-0000-4000-8000-000000000002/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007031-0000-4000-8000-000000000031.parquet'
    where bucket_id = 'published'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007027-0000-4000-8000-000000000027.parquet'$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a public object cannot be moved to a dashboard its writer cannot update'
);

select throws_ok(
  $$update storage.objects
    set name = 'dashboards/d2004003-0000-4000-8000-000000000003/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007033-0000-4000-8000-000000000033.parquet'
    where bucket_id = 'published'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007027-0000-4000-8000-000000000027.parquet'$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a public object cannot be moved into another workspace'
);

-- Unauthorized DELETE attempts affect zero rows in both buckets ------------

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000003-0000-4000-8000-000000000003"}',
  true
);

select results_eq(
  $$delete from storage.objects
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007012-0000-4000-8000-000000000012.parquet'
    returning name$$,
  array[]::text[],
  'an unshared member cannot delete a published-private object'
);

select results_eq(
  $$delete from storage.objects
    where bucket_id = 'published'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007014-0000-4000-8000-000000000014.parquet'
    returning name$$,
  array[]::text[],
  'an unshared member cannot delete a published object'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000005-0000-4000-8000-000000000005"}',
  true
);

select results_eq(
  $$delete from storage.objects
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007013-0000-4000-8000-000000000013.parquet'
    returning name$$,
  array[]::text[],
  'a cross-workspace editor cannot delete a published-private object'
);

select results_eq(
  $$delete from storage.objects
    where bucket_id = 'published'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007015-0000-4000-8000-000000000015.parquet'
    returning name$$,
  array[]::text[],
  'a cross-workspace editor cannot delete a published object'
);

-- A viewer can see the source row but cannot UPDATE or DELETE it ------------

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000002-0000-4000-8000-000000000002"}',
  true
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published',
      'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007040-0000-4000-8000-000000000040.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a viewer cannot insert a published object'
);

select results_eq(
  $$update storage.objects
    set metadata = '{"attempted_by":"viewer"}'::jsonb
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007016-0000-4000-8000-000000000016.parquet'
    returning name$$,
  array[]::text[],
  'a viewer cannot update a visible published-private object'
);

select results_eq(
  $$delete from storage.objects
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007016-0000-4000-8000-000000000016.parquet'
    returning name$$,
  array[]::text[],
  'a viewer cannot delete a visible published-private object'
);

select results_eq(
  $$update storage.objects
    set metadata = '{"attempted_by":"viewer"}'::jsonb
    where bucket_id = 'published'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007017-0000-4000-8000-000000000017.parquet'
    returning name$$,
  array[]::text[],
  'a viewer cannot update a visible published object'
);

select results_eq(
  $$delete from storage.objects
    where bucket_id = 'published'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007017-0000-4000-8000-000000000017.parquet'
    returning name$$,
  array[]::text[],
  'a viewer cannot delete a visible published object'
);

-- A private-target snapshot stays hidden until workspace visibility commits -

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000004-0000-4000-8000-000000000004"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/33333333-3333-4333-8333-333333333333/datasets/d2007018-0000-4000-8000-000000000018.parquet'
  ),
  0,
  'an editor cannot read a private object outside the active public-target claim'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/33333333-3333-4333-8333-333333333333/datasets/d2007018-0000-4000-8000-000000000018.parquet'
  ),
  0,
  'a viewer cannot read a staged private-target object while dashboard visibility is public'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000003-0000-4000-8000-000000000003"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/33333333-3333-4333-8333-333333333333/datasets/d2007018-0000-4000-8000-000000000018.parquet'
  ),
  0,
  'an unrelated authenticated user cannot read a private-target object while dashboard visibility is public'
);

reset role;

update public.dashboards
set
  snapshot_transition_kind = 'abort_publish'
where id = 'd2004004-0000-4000-8000-000000000004'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000004-0000-4000-8000-000000000004"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/33333333-3333-4333-8333-333333333333/datasets/d2007018-0000-4000-8000-000000000018.parquet'
  ),
  0,
  'an editor cannot read a private object outside the active abort claim'
);

reset role;

update public.dashboards
set
  snapshot_transition_kind = null,
  snapshot_transition_revision = null,
  snapshot_transition_prior_revision = null,
  snapshot_transition_prior_visibility = null,
  snapshot_transition_target_visibility = null
where id = 'd2004004-0000-4000-8000-000000000004'::uuid;

update public.dashboards
set
  snapshot_transition_kind = 'publish',
  snapshot_transition_revision = '33333333-3333-4333-8333-333333333333'::uuid,
  snapshot_transition_prior_revision = snapshot_revision,
  snapshot_transition_prior_visibility = visibility,
  snapshot_transition_target_visibility = 'workspace'
where id = 'd2004004-0000-4000-8000-000000000004'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000004-0000-4000-8000-000000000004"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/33333333-3333-4333-8333-333333333333/datasets/d2007018-0000-4000-8000-000000000018.parquet'
  ),
  1,
  'an editor can read the exact active private-target revision'
);

reset role;

update public.dashboards
set
  visibility = 'workspace'::public.dashboard_visibility,
  snapshot_revision = snapshot_transition_revision,
  snapshot_transition_kind = null,
  snapshot_transition_revision = null,
  snapshot_transition_prior_revision = null,
  snapshot_transition_prior_visibility = null,
  snapshot_transition_target_visibility = null
where id = 'd2004004-0000-4000-8000-000000000004'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/33333333-3333-4333-8333-333333333333/datasets/d2007018-0000-4000-8000-000000000018.parquet'
  ),
  1,
  'a viewer can read the private-target object after workspace visibility commits'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000003-0000-4000-8000-000000000003"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/33333333-3333-4333-8333-333333333333/datasets/d2007018-0000-4000-8000-000000000018.parquet'
  ),
  0,
  'an unrelated authenticated user remains unable to read the workspace snapshot'
);

-- Abort claims delete only their exact staged generation and target bucket --

reset role;

update public.dashboards
set
  snapshot_transition_kind = 'publish',
  snapshot_transition_revision = '22222222-2222-4222-8222-222222222222',
  snapshot_transition_prior_revision = snapshot_revision,
  snapshot_transition_prior_visibility = visibility,
  snapshot_transition_target_visibility = 'public'
where id = 'd2004004-0000-4000-8000-000000000004'::uuid;

update public.dashboards
set snapshot_transition_kind = 'abort_publish'
where id in (
  'd2004001-0000-4000-8000-000000000001'::uuid,
  'd2004004-0000-4000-8000-000000000004'::uuid
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000001-0000-4000-8000-000000000001"}',
  true
);

select results_eq(
  $$delete from storage.objects
    where bucket_id = 'published-private'
      and name = 'dashboards/d2004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007004-0000-4000-8000-000000000004.parquet'
    returning name$$,
  array[
    'dashboards/d2004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007004-0000-4000-8000-000000000004.parquet'
  ]::text[],
  'an abort claim can delete its exact staged private object'
);

select results_eq(
  $$delete from storage.objects
    where bucket_id = 'published'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007023-0000-4000-8000-000000000023.parquet'
    returning name$$,
  array[
    'dashboards/d2004004-0000-4000-8000-000000000004/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007023-0000-4000-8000-000000000023.parquet'
  ]::text[],
  'an abort claim can delete its exact staged public object'
);

-- DELETE stays editor-tier on BOTH buckets, deliberately. Writing to the
-- world-readable bucket creates exposure and so takes the admin bar; removing
-- from it retracts exposure, and aborting one's own failed publish is ordinary
-- editor work. Raising this bar would strand staged bytes in the public bucket
-- whenever the editor who uploaded them is not an admin.

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000004-0000-4000-8000-000000000004"}',
  true
);

select results_eq(
  $$delete from storage.objects
    where bucket_id = 'published'
      and name = 'dashboards/d2004004-0000-4000-8000-000000000004/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007027-0000-4000-8000-000000000027.parquet'
    returning name$$,
  array[
    'dashboards/d2004004-0000-4000-8000-000000000004/revisions/22222222-2222-4222-8222-222222222222/datasets/d2007027-0000-4000-8000-000000000027.parquet'
  ]::text[],
  'an editor without the dashboards admin role can abort its own public staging'
);

-- Delete cleanup requires admin authority, even with an editor share --------

reset role;

update public.dashboards
set
  snapshot_transition_kind = null,
  snapshot_transition_revision = null,
  snapshot_transition_prior_revision = null,
  snapshot_transition_prior_visibility = null,
  snapshot_transition_target_visibility = null
where id = 'd2004001-0000-4000-8000-000000000001'::uuid;

update public.dashboards
set
  visibility = 'draft'::public.dashboard_visibility,
  snapshot_transition_kind = 'delete',
  snapshot_transition_revision = '44444444-4444-4444-8444-444444444444'::uuid,
  snapshot_transition_prior_revision = snapshot_revision,
  snapshot_transition_prior_visibility = visibility
where id = 'd2004001-0000-4000-8000-000000000001'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000004-0000-4000-8000-000000000004"}',
  true
);

select is(
  private.util__auth_user_can_delete_dashboard_snapshot_object(
    'published-private',
    'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007001-0000-4000-8000-000000000001.parquet'
  ),
  false,
  'an editor share cannot delete snapshot objects during a dashboard delete transition'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"d2000001-0000-4000-8000-000000000001"}',
  true
);

select is(
  private.util__auth_user_can_delete_dashboard_snapshot_object(
    'published-private',
    'dashboards/d2004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/d2007001-0000-4000-8000-000000000001.parquet'
  ),
  true,
  'the dashboard owner may delete snapshot objects during a delete transition'
);

select * from finish();

rollback;
