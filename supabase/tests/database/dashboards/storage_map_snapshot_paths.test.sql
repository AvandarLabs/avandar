\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- A public dashboard's map is published as one JSON file per map, named
-- `dashboards/<dashboardId>/revisions/<revision>/maps/<mapId>.json`, in the
-- same snapshot buckets as its datasets. The path parsers decide which
-- dashboard and generation every storage policy checks, so they are what has
-- to recognise the name.
select plan(8);

select is(
  public.util__storage_object_dashboard_id (
    'dashboards/f5004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/maps/f5008001-0000-4000-8000-000000000001.json'
  ),
  'f5004001-0000-4000-8000-000000000001'::uuid,
  'extracts the dashboard id from a map snapshot path'
);

select is(
  public.util__storage_object_snapshot_revision (
    'dashboards/f5004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/maps/f5008001-0000-4000-8000-000000000001.json'
  ),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
  'extracts the revision from a map snapshot path'
);

select is(
  public.util__storage_object_dashboard_id (
    'dashboards/f5004001-0000-4000-8000-000000000001/maps/f5008001-0000-4000-8000-000000000001.json'
  ),
  null::uuid,
  'rejects a map snapshot outside a revision folder'
);

select is(
  public.util__storage_object_snapshot_revision (
    'dashboards/f5004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/maps/f5008001-0000-4000-8000-000000000001.parquet'
  ),
  null::uuid,
  'rejects a map snapshot that is not JSON'
);

select is(
  public.util__storage_object_dashboard_id (
    'dashboards/f5004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/maps/not-a-map.json'
  ),
  null::uuid,
  'rejects a malformed map id'
);

insert into auth.users (id, email, aud, role)
values
  ('f5000001-0000-4000-8000-000000000001'::uuid, 'f5_owner@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'f5001001-0000-4000-8000-000000000001'::uuid,
  'f5000001-0000-4000-8000-000000000001'::uuid,
  'F5 workspace',
  'f5-map-snapshot-paths'
);

insert into public.role_groups (id, workspace_id, name, is_builtin)
values ('f500cf01-0000-4000-8000-000000000001'::uuid, 'f5001001-0000-4000-8000-000000000001'::uuid, 'F5 admin', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values ('f500cf01-0000-4000-8000-000000000001'::uuid, 'dashboards'::public.app_type, 'admin'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values (
  'f5002001-0000-4000-8000-000000000001'::uuid,
  'f5001001-0000-4000-8000-000000000001'::uuid,
  'f5000001-0000-4000-8000-000000000001'::uuid,
  'f500cf01-0000-4000-8000-000000000001'::uuid
);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values (
  'f5003001-0000-4000-8000-000000000001'::uuid,
  'f5000001-0000-4000-8000-000000000001'::uuid,
  'f5001001-0000-4000-8000-000000000001'::uuid,
  'f5002001-0000-4000-8000-000000000001'::uuid,
  'F5 Owner',
  'F5 Owner'
);

insert into public.dashboards (
  id, workspace_id, owner_id, owner_profile_id, name, config, visibility,
  is_restricted, snapshot_revision
)
values (
  'f5004001-0000-4000-8000-000000000001'::uuid,
  'f5001001-0000-4000-8000-000000000001'::uuid,
  'f5000001-0000-4000-8000-000000000001'::uuid,
  'f5003001-0000-4000-8000-000000000001'::uuid,
  'F5 public dashboard',
  '{}'::jsonb,
  'public'::public.dashboard_visibility,
  false,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid
);

insert into storage.buckets (id, name, public)
values ('published', 'published', false)
on conflict (id) do nothing;

insert into storage.objects (bucket_id, name, owner)
values
  (
    'published',
    'dashboards/f5004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/maps/f5008001-0000-4000-8000-000000000001.json',
    'f5000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'published',
    'dashboards/f5004001-0000-4000-8000-000000000001/revisions/cccccccc-cccc-4ccc-8ccc-ccccccccccc1/maps/f5008001-0000-4000-8000-000000000001.json',
    'f5000001-0000-4000-8000-000000000001'::uuid
  );

-- Anonymous visitors read only the committed generation --------------------

set local role anon;

select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name = 'dashboards/f5004001-0000-4000-8000-000000000001/revisions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/maps/f5008001-0000-4000-8000-000000000001.json'
  ),
  1,
  'an anonymous visitor can read the committed map snapshot of a public dashboard'
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'published'
      and name = 'dashboards/f5004001-0000-4000-8000-000000000001/revisions/cccccccc-cccc-4ccc-8ccc-ccccccccccc1/maps/f5008001-0000-4000-8000-000000000001.json'
  ),
  0,
  'an anonymous visitor cannot read a map snapshot from another generation'
);

reset role;

-- An admin with an open public publish claim can stage a map snapshot -----

update public.dashboards
set
  snapshot_transition_kind = 'publish',
  snapshot_transition_revision = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  snapshot_transition_prior_revision = snapshot_revision,
  snapshot_transition_prior_visibility = visibility,
  snapshot_transition_target_visibility = 'public'::public.dashboard_visibility
where id = 'f5004001-0000-4000-8000-000000000001'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"f5000001-0000-4000-8000-000000000001"}',
  true
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'published',
      'dashboards/f5004001-0000-4000-8000-000000000001/revisions/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1/maps/f5008001-0000-4000-8000-000000000001.json'
    )$$,
  'a dashboards admin with an open public claim can stage a map snapshot'
);

reset role;

select * from finish();

rollback;
