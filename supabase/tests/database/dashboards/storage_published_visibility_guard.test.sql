\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

select plan(26);

insert into auth.users (id, email, aud, role)
values
  ('e3000001-0000-4000-8000-000000000001'::uuid, 'e3_reader@test.dev', 'authenticated', 'authenticated'),
  ('e3000002-0000-4000-8000-000000000002'::uuid, 'e3_other_owner@test.dev', 'authenticated', 'authenticated'),
  ('e3000003-0000-4000-8000-000000000003'::uuid, 'e3_editor@test.dev', 'authenticated', 'authenticated'),
  ('e3000004-0000-4000-8000-000000000004'::uuid, 'e3_viewer@test.dev', 'authenticated', 'authenticated'),
  ('e3000005-0000-4000-8000-000000000005'::uuid, 'e3_admin@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values
  (
    'e3001001-0000-4000-8000-000000000001'::uuid,
    'e3000001-0000-4000-8000-000000000001'::uuid,
    'E3 reader workspace',
    'e3-reader-workspace'
  ),
  (
    'e3001002-0000-4000-8000-000000000002'::uuid,
    'e3000002-0000-4000-8000-000000000002'::uuid,
    'E3 other workspace',
    'e3-other-workspace'
  );

-- The public bucket holds bytes the open internet can read, so writing into it
-- is an admin-tier act. `e3 admins` is what makes e3000005 a Dashboards admin
-- without any share on the dashboard.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values (
  'e300cf01-0000-4000-8000-000000000001'::uuid,
  'e3001001-0000-4000-8000-000000000001'::uuid,
  'e3 admins',
  false
);

insert into public.role_group_app_roles (role_group_id, app, role)
values (
  'e300cf01-0000-4000-8000-000000000001'::uuid,
  'dashboards'::public.app_type,
  'admin'::public.role_level
);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values (
  'e3002005-0000-4000-8000-000000000005'::uuid,
  'e3001001-0000-4000-8000-000000000001'::uuid,
  'e3000005-0000-4000-8000-000000000005'::uuid,
  'e300cf01-0000-4000-8000-000000000001'::uuid
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  (
    'e3002001-0000-4000-8000-000000000001'::uuid,
    'e3001001-0000-4000-8000-000000000001'::uuid,
    'e3000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'e3002002-0000-4000-8000-000000000002'::uuid,
    'e3001002-0000-4000-8000-000000000002'::uuid,
    'e3000002-0000-4000-8000-000000000002'::uuid
  ),
  (
    'e3002003-0000-4000-8000-000000000003'::uuid,
    'e3001001-0000-4000-8000-000000000001'::uuid,
    'e3000003-0000-4000-8000-000000000003'::uuid
  ),
  (
    'e3002004-0000-4000-8000-000000000004'::uuid,
    'e3001001-0000-4000-8000-000000000001'::uuid,
    'e3000004-0000-4000-8000-000000000004'::uuid
  );

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
)
values
  (
    'e3003001-0000-4000-8000-000000000001'::uuid,
    'e3000001-0000-4000-8000-000000000001'::uuid,
    'e3001001-0000-4000-8000-000000000001'::uuid,
    'e3002001-0000-4000-8000-000000000001'::uuid,
    'E3 Reader',
    'E3 Reader'
  ),
  (
    'e3003002-0000-4000-8000-000000000002'::uuid,
    'e3000002-0000-4000-8000-000000000002'::uuid,
    'e3001002-0000-4000-8000-000000000002'::uuid,
    'e3002002-0000-4000-8000-000000000002'::uuid,
    'E3 Other Owner',
    'E3 Other Owner'
  );

insert into public.dashboards (
  id, workspace_id, owner_id, owner_profile_id, name, config, visibility,
  snapshot_revision
)
values
  (
    'e3004001-0000-4000-8000-000000000001'::uuid,
    'e3001001-0000-4000-8000-000000000001'::uuid,
    'e3000001-0000-4000-8000-000000000001'::uuid,
    'e3003001-0000-4000-8000-000000000001'::uuid,
    'E3 workspace dashboard',
    '{}'::jsonb,
    'workspace'::public.dashboard_visibility,
    '11111111-1111-4111-8111-111111111111'::uuid
  ),
  (
    'e3004002-0000-4000-8000-000000000002'::uuid,
    'e3001001-0000-4000-8000-000000000001'::uuid,
    'e3000001-0000-4000-8000-000000000001'::uuid,
    'e3003001-0000-4000-8000-000000000001'::uuid,
    'E3 draft dashboard',
    '{}'::jsonb,
    'draft'::public.dashboard_visibility,
    null
  ),
  (
    'e3004003-0000-4000-8000-000000000003'::uuid,
    'e3001001-0000-4000-8000-000000000001'::uuid,
    'e3000001-0000-4000-8000-000000000001'::uuid,
    'e3003001-0000-4000-8000-000000000001'::uuid,
    'E3 cross-tenant public dashboard',
    '{}'::jsonb,
    'public'::public.dashboard_visibility,
    '11111111-1111-4111-8111-111111111111'::uuid
  );

insert into public.resource_shares (
  resource_type, resource_id, workspace_id, principal_type, principal_id, role
)
values
  (
    'dashboard'::public.resource_type,
    'e3004001-0000-4000-8000-000000000001'::uuid,
    'e3001001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    'e3000003-0000-4000-8000-000000000003'::uuid,
    'editor'::public.role_level
  ),
  (
    'dashboard'::public.resource_type,
    'e3004001-0000-4000-8000-000000000001'::uuid,
    'e3001001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    'e3000004-0000-4000-8000-000000000004'::uuid,
    'viewer'::public.role_level
  ),
  -- The admin carries the SAME editor share as e3000003, so the only thing
  -- separating them below is the dashboards admin app role. The share is also
  -- what lets an UPDATE ... RETURNING see its own row: dashboard SELECT RLS
  -- hides another member's unshared workspace dashboard even from an admin.
  (
    'dashboard'::public.resource_type,
    'e3004001-0000-4000-8000-000000000001'::uuid,
    'e3001001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    'e3000005-0000-4000-8000-000000000005'::uuid,
    'editor'::public.role_level
  );

insert into storage.buckets (id, name, public)
values ('published', 'published', true)
on conflict (id) do nothing;

insert into storage.objects (bucket_id, name, owner)
values
  (
    'published',
    'dashboards/e3004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/e3007001-0000-4000-8000-000000000001.parquet',
    'e3000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published',
    'dashboards/e3004002-0000-4000-8000-000000000002/revisions/11111111-1111-4111-8111-111111111111/datasets/e3007002-0000-4000-8000-000000000002.parquet',
    'e3000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published',
    'dashboards/e3004003-0000-4000-8000-000000000003/revisions/11111111-1111-4111-8111-111111111111/datasets/e3007003-0000-4000-8000-000000000003.parquet',
    'e3000002-0000-4000-8000-000000000002'::uuid
  ),
  (
    'published',
    'dashboards/not-a-uuid/datasets/e3007004-0000-4000-8000-000000000004.parquet',
    'e3000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published',
    'workspaces/e3004001-0000-4000-8000-000000000001/datasets/e3007005-0000-4000-8000-000000000005.parquet',
    'e3000001-0000-4000-8000-000000000001'::uuid
  );

update public.dashboards
set
  snapshot_transition_kind = 'publish',
  snapshot_transition_revision = '22222222-2222-4222-8222-222222222222',
  snapshot_transition_prior_revision = snapshot_revision,
  snapshot_transition_prior_visibility = visibility,
  snapshot_transition_target_visibility = 'public'
where id = 'e3004001-0000-4000-8000-000000000001'::uuid;

select is(
  (
    select public
    from storage.buckets
    where id = 'published'
  ),
  false,
  'the published bucket is private so reads cannot bypass object RLS'
);

set local role anon;
set local "request.jwt.claims" to '{"role":"anon"}';

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name like 'dashboards/e3004001-%'
  ),
  0,
  'anonymous users cannot read a staged object for a workspace dashboard'
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name like 'dashboards/e3004002-%'
  ),
  0,
  'anonymous users cannot read an object for a draft dashboard'
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name like 'dashboards/e3004003-%'
  ),
  1,
  'anonymous users can read an object only after its dashboard is public'
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name like 'dashboards/not-a-uuid/%'
  ),
  0,
  'anonymous users cannot read a malformed dashboard path'
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name like 'workspaces/%'
  ),
  0,
  'anonymous users cannot read a non-dashboard path'
);

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"e3000002-0000-4000-8000-000000000002"}';

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name like 'dashboards/e3004001-%'
  ),
  0,
  'unrelated authenticated users cannot read staged workspace objects'
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name like 'dashboards/e3004002-%'
  ),
  0,
  'unrelated authenticated users cannot read staged draft objects'
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name like 'dashboards/e3004003-%'
  ),
  1,
  'authenticated users can read a public object across tenant boundaries'
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name like 'dashboards/not-a-uuid/%'
  ),
  0,
  'authenticated users cannot read a malformed dashboard path'
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name like 'workspaces/%'
  ),
  0,
  'authenticated users cannot read a non-dashboard path'
);

-- Readers see committed objects only through dashboard SELECT authorization.
-- Editors additionally see only the exact active staged revision and bucket.

set local "request.jwt.claims" to '{"sub":"e3000001-0000-4000-8000-000000000001"}';

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name like 'dashboards/e3004001-%'
  ),
  0,
  'the dashboard owner cannot read a committed workspace object from the public bucket'
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name like 'dashboards/e3004002-%'
  ),
  0,
  'the dashboard owner cannot read an object without an exact publish claim'
);

set local "request.jwt.claims" to '{"sub":"e3000003-0000-4000-8000-000000000003"}';

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name like 'dashboards/e3004001-%'
  ),
  0,
  'an editor cannot list a prior revision as though it were staged'
);

-- The transition trigger gates the DECISION to expose a dashboard publicly.
-- These two assertions gate the CONTENT: without them an editor could overwrite
-- the bytes of a claim an admin opened, and the admin would settle the
-- transition over data no admin ever approved.
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published',
      'dashboards/e3004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/e3007010-0000-4000-8000-000000000010.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'an editor cannot insert a staged object into the world-readable bucket'
);

set local "request.jwt.claims" to '{"sub":"e3000005-0000-4000-8000-000000000005"}';

select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published',
      'dashboards/e3004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/e3007010-0000-4000-8000-000000000010.parquet'
    )$$,
  'a dashboards admin can insert a staged object into the world-readable bucket'
);

set local "request.jwt.claims" to '{"sub":"e3000003-0000-4000-8000-000000000003"}';

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name = 'dashboards/e3004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/e3007010-0000-4000-8000-000000000010.parquet'
  ),
  1,
  'an editor can read only the exact active staged revision'
);

-- An overwrite reaches the open internet exactly as an insert does, so UPDATE
-- carries the same admin requirement.
select results_eq(
  $$update storage.objects
    set metadata = '{"retry":"updated"}'::jsonb
    where bucket_id = 'published'
      and name = 'dashboards/e3004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/e3007010-0000-4000-8000-000000000010.parquet'
    returning name$$,
  array[]::text[],
  'an editor cannot update a staged object in the world-readable bucket'
);

set local "request.jwt.claims" to '{"sub":"e3000005-0000-4000-8000-000000000005"}';

select results_eq(
  $$update storage.objects
    set metadata = '{"retry":"updated"}'::jsonb
    where bucket_id = 'published'
      and name = 'dashboards/e3004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/e3007010-0000-4000-8000-000000000010.parquet'
    returning name$$,
  array[
    'dashboards/e3004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/e3007010-0000-4000-8000-000000000010.parquet'
  ]::text[],
  'a dashboards admin can update a staged object for retry-compatible upsert semantics'
);

set local "request.jwt.claims" to '{"sub":"e3000003-0000-4000-8000-000000000003"}';

select set_config('storage.allow_delete_query', 'true', true);

select results_eq(
  $$delete from storage.objects
    where bucket_id = 'published'
      and name = 'dashboards/e3004001-0000-4000-8000-000000000001/revisions/22222222-2222-4222-8222-222222222222/datasets/e3007010-0000-4000-8000-000000000010.parquet'
    returning name$$,
  array[]::text[],
  'an active publish claim denies deletion of its staged object'
);

set local "request.jwt.claims" to '{"sub":"e3000004-0000-4000-8000-000000000004"}';

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name like 'dashboards/e3004001-%'
  ),
  0,
  'a viewer cannot read an object from the bucket for another visibility'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published',
      'dashboards/e3004001-0000-4000-8000-000000000001/revisions/11111111-1111-4111-8111-111111111111/datasets/e3007011-0000-4000-8000-000000000011.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a viewer cannot insert a staged object'
);

select results_eq(
  $$update storage.objects
    set metadata = '{"attempted_by":"viewer"}'::jsonb
    where bucket_id = 'published'
      and name like 'dashboards/e3004001-%'
    returning name$$,
  array[]::text[],
  'a viewer cannot update staged objects'
);

select results_eq(
  $$delete from storage.objects
    where bucket_id = 'published'
      and name like 'dashboards/e3004001-%'
    returning name$$,
  array[]::text[],
  'a viewer cannot delete staged objects'
);

set local role postgres;

update public.dashboards
set
  visibility = 'public'::public.dashboard_visibility,
  snapshot_revision = snapshot_transition_revision,
  snapshot_transition_kind = null,
  snapshot_transition_revision = null,
  snapshot_transition_prior_revision = null,
  snapshot_transition_prior_visibility = null,
  snapshot_transition_target_visibility = null
where id = 'e3004001-0000-4000-8000-000000000001'::uuid;

set local role anon;
set local "request.jwt.claims" to '{"role":"anon"}';

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name like 'dashboards/e3004001-%'
  ),
  1,
  'the staged object becomes anonymously readable after public visibility commits'
);

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"e3000002-0000-4000-8000-000000000002"}';

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name like 'dashboards/e3004001-%'
  ),
  1,
  'the staged object becomes authenticated-readable after public visibility commits'
);

select * from finish();

rollback;
