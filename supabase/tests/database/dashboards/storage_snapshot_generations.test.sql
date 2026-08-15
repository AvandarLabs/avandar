\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

select plan(44);

select has_column(
  'public',
  'dashboards',
  'snapshot_revision',
  'dashboards has a committed snapshot revision pointer'
);

select is(
  public.util__storage_object_dashboard_id (
    'dashboards/f4004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/datasets/f4007001-0000-4000-8000-000000000001.parquet'
  ),
  'f4004001-0000-4000-8000-000000000001'::uuid,
  'extracts the dashboard id from the exact snapshot path'
);

select is(
  public.util__storage_object_snapshot_revision (
    'dashboards/f4004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/datasets/f4007001-0000-4000-8000-000000000001.parquet'
  ),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
  'extracts the revision from the exact snapshot path'
);

select is(
  public.util__storage_object_dashboard_id (
    'dashboards/f4004001-0000-4000-8000-000000000001/datasets/f4007001-0000-4000-8000-000000000001.parquet'
  ),
  'f4004001-0000-4000-8000-000000000001'::uuid,
  'extracts the dashboard id from the exact legacy snapshot path'
);

select is(
  public.util__storage_object_snapshot_revision (
    'dashboards/f4004001-0000-4000-8000-000000000001/datasets/f4007001-0000-4000-8000-000000000001.parquet'
  ),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'maps the exact legacy snapshot path to the reserved revision'
);

select is(
  public.util__storage_object_dashboard_id (
    'dashboards/f4004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/datasets/f4007001-0000-4000-8000-000000000001.parquet/extra'
  ),
  null::uuid,
  'rejects extra path segments when parsing the dashboard id'
);

select is(
  public.util__storage_object_snapshot_revision (
    'dashboards/f4004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/datasets/f4007001-0000-4000-8000-000000000001.parquet/extra'
  ),
  null::uuid,
  'rejects extra path segments when parsing the revision'
);

select is(
  public.util__storage_object_dashboard_id (
    'dashboards/f4004001-0000-4000-8000-000000000001/revisions/not-a-uuid/datasets/f4007001-0000-4000-8000-000000000001.parquet'
  ),
  null::uuid,
  'rejects a malformed revision when parsing the dashboard id'
);

select is(
  public.util__storage_object_snapshot_revision (
    'dashboards/f4004001-0000-4000-8000-000000000001/revisions/not-a-uuid/datasets/f4007001-0000-4000-8000-000000000001.parquet'
  ),
  null::uuid,
  'rejects a malformed revision when parsing the revision'
);

select is(
  public.util__storage_object_dashboard_id (
    'dashboards/f4004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/datasets/not-a-uuid.parquet'
  ),
  null::uuid,
  'rejects a malformed dataset filename when parsing the dashboard id'
);

select is(
  public.util__storage_object_snapshot_revision (
    'dashboards/f4004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/datasets/not-a-uuid.parquet'
  ),
  null::uuid,
  'rejects a malformed dataset filename when parsing the revision'
);

insert into auth.users (id, email, aud, role)
values
  ('f4000001-0000-4000-8000-000000000001'::uuid, 'f4_owner@test.dev', 'authenticated', 'authenticated'),
  ('f4000002-0000-4000-8000-000000000002'::uuid, 'f4_editor@test.dev', 'authenticated', 'authenticated'),
  ('f4000003-0000-4000-8000-000000000003'::uuid, 'f4_viewer@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'f4001001-0000-4000-8000-000000000001'::uuid,
  'f4000001-0000-4000-8000-000000000001'::uuid,
  'F4 workspace',
  'f4-snapshot-generations'
);

insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('f400cf01-0000-4000-8000-000000000001'::uuid, 'f4001001-0000-4000-8000-000000000001'::uuid, 'F4 editor', false),
  ('f400cf02-0000-4000-8000-000000000002'::uuid, 'f4001001-0000-4000-8000-000000000001'::uuid, 'F4 viewer', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('f400cf01-0000-4000-8000-000000000001'::uuid, 'dashboards'::public.app_type, 'editor'::public.role_level),
  ('f400cf02-0000-4000-8000-000000000002'::uuid, 'dashboards'::public.app_type, 'viewer'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('f4002001-0000-4000-8000-000000000001'::uuid, 'f4001001-0000-4000-8000-000000000001'::uuid, 'f4000001-0000-4000-8000-000000000001'::uuid, 'f400cf01-0000-4000-8000-000000000001'::uuid),
  ('f4002002-0000-4000-8000-000000000002'::uuid, 'f4001001-0000-4000-8000-000000000001'::uuid, 'f4000002-0000-4000-8000-000000000002'::uuid, 'f400cf01-0000-4000-8000-000000000001'::uuid),
  ('f4002003-0000-4000-8000-000000000003'::uuid, 'f4001001-0000-4000-8000-000000000001'::uuid, 'f4000003-0000-4000-8000-000000000003'::uuid, 'f400cf02-0000-4000-8000-000000000002'::uuid);

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
)
values (
  'f4003001-0000-4000-8000-000000000001'::uuid,
  'f4000001-0000-4000-8000-000000000001'::uuid,
  'f4001001-0000-4000-8000-000000000001'::uuid,
  'f4002001-0000-4000-8000-000000000001'::uuid,
  'F4 Owner',
  'F4 Owner'
);

insert into public.dashboards (
  id,
  workspace_id,
  owner_id,
  owner_profile_id,
  name,
  config,
  visibility,
  is_restricted,
  snapshot_revision
)
values
  (
    'f4004001-0000-4000-8000-000000000001'::uuid,
    'f4001001-0000-4000-8000-000000000001'::uuid,
    'f4000001-0000-4000-8000-000000000001'::uuid,
    'f4003001-0000-4000-8000-000000000001'::uuid,
    'F4 public dashboard',
    '{}'::jsonb,
    'public'::public.dashboard_visibility,
    false,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid
  ),
  (
    'f4004002-0000-4000-8000-000000000002'::uuid,
    'f4001001-0000-4000-8000-000000000001'::uuid,
    'f4000001-0000-4000-8000-000000000001'::uuid,
    'f4003001-0000-4000-8000-000000000001'::uuid,
    'F4 workspace dashboard',
    '{}'::jsonb,
    'workspace'::public.dashboard_visibility,
    false,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid
  ),
  (
    'f4004003-0000-4000-8000-000000000003'::uuid,
    'f4001001-0000-4000-8000-000000000001'::uuid,
    'f4000001-0000-4000-8000-000000000001'::uuid,
    'f4003001-0000-4000-8000-000000000001'::uuid,
    'F4 restricted workspace dashboard',
    '{}'::jsonb,
    'workspace'::public.dashboard_visibility,
    true,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid
  ),
  (
    'f4004004-0000-4000-8000-000000000004'::uuid,
    'f4001001-0000-4000-8000-000000000001'::uuid,
    'f4000001-0000-4000-8000-000000000001'::uuid,
    'f4003001-0000-4000-8000-000000000001'::uuid,
    'F4 draft dashboard',
    '{}'::jsonb,
    'draft'::public.dashboard_visibility,
    false,
    null
  ),
  (
    'f4004005-0000-4000-8000-000000000005'::uuid,
    'f4001001-0000-4000-8000-000000000001'::uuid,
    'f4000001-0000-4000-8000-000000000001'::uuid,
    'f4003001-0000-4000-8000-000000000001'::uuid,
    'F4 legacy public dashboard',
    '{}'::jsonb,
    'public'::public.dashboard_visibility,
    false,
    '00000000-0000-0000-0000-000000000000'::uuid
  );

insert into public.resource_shares (
  id,
  workspace_id,
  resource_type,
  resource_id,
  principal_type,
  principal_id,
  role
)
values (
  'f4005001-0000-4000-8000-000000000001'::uuid,
  'f4001001-0000-4000-8000-000000000001'::uuid,
  'dashboard'::public.resource_type,
  'f4004004-0000-4000-8000-000000000004'::uuid,
  'user'::public.share_principal_type,
  'f4000002-0000-4000-8000-000000000002'::uuid,
  'editor'::public.role_level
);

insert into storage.objects (bucket_id, name, owner)
values
  ('published', 'dashboards/f4004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/datasets/f4007001-0000-4000-8000-000000000001.parquet', 'f4000001-0000-4000-8000-000000000001'::uuid),
  ('published', 'dashboards/f4004001-0000-4000-8000-000000000001/revisions/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2/datasets/f4007002-0000-4000-8000-000000000002.parquet', 'f4000001-0000-4000-8000-000000000001'::uuid),
  ('published-private', 'dashboards/f4004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/datasets/f4007003-0000-4000-8000-000000000003.parquet', 'f4000001-0000-4000-8000-000000000001'::uuid),
  ('published-private', 'dashboards/f4004002-0000-4000-8000-000000000002/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/datasets/f4007004-0000-4000-8000-000000000004.parquet', 'f4000001-0000-4000-8000-000000000001'::uuid),
  ('published-private', 'dashboards/f4004002-0000-4000-8000-000000000002/revisions/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2/datasets/f4007005-0000-4000-8000-000000000005.parquet', 'f4000001-0000-4000-8000-000000000001'::uuid),
  ('published', 'dashboards/f4004002-0000-4000-8000-000000000002/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/datasets/f4007006-0000-4000-8000-000000000006.parquet', 'f4000001-0000-4000-8000-000000000001'::uuid),
  ('published-private', 'dashboards/f4004003-0000-4000-8000-000000000003/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/datasets/f4007007-0000-4000-8000-000000000007.parquet', 'f4000001-0000-4000-8000-000000000001'::uuid),
  ('published', 'dashboards/f4004004-0000-4000-8000-000000000004/revisions/dddddddd-dddd-4ddd-8ddd-ddddddddddd4/datasets/f4007008-0000-4000-8000-000000000008.parquet', 'f4000001-0000-4000-8000-000000000001'::uuid),
  ('published-private', 'dashboards/f4004004-0000-4000-8000-000000000004/revisions/dddddddd-dddd-4ddd-8ddd-ddddddddddd4/datasets/f4007009-0000-4000-8000-000000000009.parquet', 'f4000001-0000-4000-8000-000000000001'::uuid),
  ('published', 'dashboards/f4004005-0000-4000-8000-000000000005/datasets/f4007012-0000-4000-8000-000000000012.parquet', 'f4000001-0000-4000-8000-000000000001'::uuid);

select is(
  (select public from storage.buckets where id = 'published'),
  false,
  'the published bucket remains private'
);

select is(
  (select public from storage.buckets where id = 'published-private'),
  false,
  'the published-private bucket remains private'
);

set local role anon;
set local "request.jwt.claims" to '{"role":"anon"}';

select is(
  (select count(*)::int from storage.objects where bucket_id = 'published' and name like '%f4007001-%'),
  1,
  'anonymous users can read the committed public generation'
);

select is(
  (select count(*)::int from storage.objects where bucket_id = 'published' and name like '%f4007002-%'),
  0,
  'anonymous users cannot read an uncommitted public generation'
);

select is(
  (select count(*)::int from storage.objects where bucket_id = 'published-private'),
  0,
  'anonymous users cannot read the private bucket'
);

select is(
  (select count(*)::int from storage.objects where name like '%f4007012-%'),
  1,
  'anonymous users can read a legacy object through the reserved committed revision'
);

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"f4000003-0000-4000-8000-000000000003"}';

select is(
  (select count(*)::int from storage.objects where name like '%f4007001-%'),
  1,
  'a viewer can read the committed public generation'
);

select is(
  (select count(*)::int from storage.objects where name like '%f4007002-%'),
  0,
  'a viewer cannot read an uncommitted public generation'
);

select is(
  (select count(*)::int from storage.objects where name like '%f4007003-%'),
  0,
  'a viewer cannot read a public generation from the private bucket'
);

select is(
  (select count(*)::int from storage.objects where name like '%f4007004-%'),
  1,
  'a viewer with dashboard access can read the committed workspace generation'
);

select is(
  (select count(*)::int from storage.objects where name like '%f4007005-%'),
  0,
  'a viewer cannot read an uncommitted workspace generation'
);

select is(
  (select count(*)::int from storage.objects where name like '%f4007006-%'),
  0,
  'a viewer cannot read a workspace generation from the public bucket'
);

select is(
  (select count(*)::int from storage.objects where name like '%f4007007-%'),
  0,
  'workspace membership without dashboard select access cannot read a generation'
);

reset role;

update public.dashboards
set
  snapshot_transition_kind = 'publish',
  snapshot_transition_revision = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4',
  snapshot_transition_prior_revision = snapshot_revision,
  snapshot_transition_prior_visibility = visibility,
  snapshot_transition_target_visibility = 'public'
where id = 'f4004004-0000-4000-8000-000000000004'::uuid;

update public.dashboards
set
  snapshot_transition_kind = 'publish',
  snapshot_transition_revision = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'::uuid,
  snapshot_transition_prior_revision = snapshot_revision,
  snapshot_transition_prior_visibility = visibility,
  snapshot_transition_target_visibility = visibility
where id = 'f4004005-0000-4000-8000-000000000005'::uuid;

update public.dashboards
set
  snapshot_revision = snapshot_transition_revision,
  snapshot_transition_kind = null,
  snapshot_transition_revision = null,
  snapshot_transition_prior_revision = null,
  snapshot_transition_prior_visibility = null,
  snapshot_transition_target_visibility = null
where id = 'f4004005-0000-4000-8000-000000000005'::uuid;

set local role anon;
set local "request.jwt.claims" to '{"role":"anon"}';

select is(
  (select count(*)::int from storage.objects where name like '%f4007012-%'),
  0,
  'the legacy generation is denied immediately after its pointer changes'
);

reset role;

update public.dashboards
set
  snapshot_transition_kind = 'publish',
  snapshot_transition_revision = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'::uuid,
  snapshot_transition_prior_revision = snapshot_revision,
  snapshot_transition_prior_visibility = visibility,
  snapshot_transition_target_visibility = visibility
where id = 'f4004002-0000-4000-8000-000000000002'::uuid;

update public.dashboards
set
  snapshot_revision = snapshot_transition_revision,
  snapshot_transition_kind = null,
  snapshot_transition_revision = null,
  snapshot_transition_prior_revision = null,
  snapshot_transition_prior_visibility = null,
  snapshot_transition_target_visibility = null
where id = 'f4004002-0000-4000-8000-000000000002'::uuid;

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"f4000003-0000-4000-8000-000000000003"}';

select is(
  (select count(*)::int from storage.objects where name like '%f4007004-%'),
  0,
  'the old workspace generation is denied immediately after the pointer changes'
);

select is(
  (select count(*)::int from storage.objects where name like '%f4007005-%'),
  1,
  'the newly committed workspace generation is immediately readable'
);

select is(
  (select count(*)::int from storage.objects where name like '%f4007008-%'),
  0,
  'a viewer cannot read a staged public generation for a draft dashboard'
);

select is(
  (select count(*)::int from storage.objects where name like '%f4007009-%'),
  0,
  'a viewer cannot read a staged private generation for a draft dashboard'
);

set local "request.jwt.claims" to '{"sub":"f4000002-0000-4000-8000-000000000002"}';

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published',
      'dashboards/f4004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/datasets/f4007013-0000-4000-8000-000000000013.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'an editor cannot insert into the committed public generation'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published-private',
      'dashboards/f4004002-0000-4000-8000-000000000002/revisions/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2/datasets/f4007014-0000-4000-8000-000000000014.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'an editor cannot insert into the committed private generation'
);

select results_eq(
  $$update storage.objects
    set metadata = '{"overwrite":true}'::jsonb
    where name like '%f4007001-%'
    returning name$$,
  array[]::text[],
  'an editor cannot update the committed public generation'
);

select results_eq(
  $$update storage.objects
    set metadata = '{"overwrite":true}'::jsonb
    where name like '%f4007005-%'
    returning name$$,
  array[]::text[],
  'an editor cannot update the committed private generation'
);

select results_eq(
  $$update storage.objects
    set metadata = '{"overwrite":true}'::jsonb
    where name like '%f4007012-%'
    returning name$$,
  array[]::text[],
  'an editor cannot update an obsolete generation without a publish claim'
);

select is(
  (select count(*)::int from storage.objects where name like '%f4007008-%'),
  1,
  'an editor can select a staged generation in the public bucket'
);

select is(
  (select count(*)::int from storage.objects where name like '%f4007009-%'),
  0,
  'an editor cannot select a staged generation from the non-target bucket'
);

-- Writing into the world-readable bucket takes the dashboards admin role (see
-- `private.util__auth_user_can_write_dashboard_snapshot_object`), so the staged
-- public generation is exercised as the workspace owner. What is under test
-- here is the generation and bucket matching, not the role bar, which
-- dashboards/storage_published_visibility_guard.test.sql pins.
set local "request.jwt.claims" to '{"sub":"f4000001-0000-4000-8000-000000000001"}';

select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published',
      'dashboards/f4004004-0000-4000-8000-000000000004/revisions/dddddddd-dddd-4ddd-8ddd-ddddddddddd4/datasets/f4007010-0000-4000-8000-000000000010.parquet'
    )$$,
  'a dashboards admin can insert a staged generation in the public bucket'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published-private',
      'dashboards/f4004004-0000-4000-8000-000000000004/revisions/dddddddd-dddd-4ddd-8ddd-ddddddddddd4/datasets/f4007011-0000-4000-8000-000000000011.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a public publish claim cannot insert into the private bucket'
);

select results_eq(
  $$update storage.objects
    set metadata = '{"retry":true}'::jsonb
    where name like '%f4007010-%'
    returning name$$,
  array[
    'dashboards/f4004004-0000-4000-8000-000000000004/revisions/dddddddd-dddd-4ddd-8ddd-ddddddddddd4/datasets/f4007010-0000-4000-8000-000000000010.parquet'
  ]::text[],
  'a dashboards admin can update a staged generation in the public bucket'
);

select results_eq(
  $$update storage.objects
    set metadata = '{"retry":true}'::jsonb
    where name like '%f4007011-%'
    returning name$$,
  array[]::text[],
  'a public publish claim cannot update the private bucket'
);

set local "request.jwt.claims" to '{"sub":"f4000002-0000-4000-8000-000000000002"}';

select set_config('storage.allow_delete_query', 'true', true);

select results_eq(
  $$delete from storage.objects
    where name like '%f4007001-%'
    returning name$$,
  array[]::text[],
  'an editor cannot delete the committed public generation'
);

select results_eq(
  $$delete from storage.objects
    where name like '%f4007005-%'
    returning name$$,
  array[]::text[],
  'an editor cannot delete the committed private generation'
);

select results_eq(
  $$delete from storage.objects
    where name like '%f4007010-%'
    returning name$$,
  array[]::text[],
  'an active publish claim denies deletion of its staged public generation'
);

select results_eq(
  $$delete from storage.objects
    where name like '%f4007011-%'
    returning name$$,
  array[]::text[],
  'a public publish claim has no staged private generation to delete'
);

select * from finish();

rollback;
