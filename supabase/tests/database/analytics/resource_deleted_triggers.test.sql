-- Covers the `dataset.deleted` and `dashboard.deleted` delete triggers.
--
-- The point of instrumenting deletion in the database rather than the client is
-- that it catches every path, so these tests delete rows directly, the way a
-- script or a cascade would, with no client involved.
--
-- Every assertion selects its event by the fixture's own resource id and not by
-- `event_name` alone. `usage_analytics_events` is not workspace-partitioned for
-- reads here, so matching on the name alone counted every such event in the
-- database: the assertions held only against a freshly reset one, and anyone
-- who ran the suite after using the app locally saw `have: 15, want: 1`.

\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values (
  'ad000001-0000-4000-8000-000000000001'::uuid,
  'ad_owner@test.dev',
  'authenticated',
  'authenticated'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'ad001001-0000-4000-8000-000000000001'::uuid,
  'ad000001-0000-4000-8000-000000000001'::uuid,
  'ad workspace',
  'ad-resource-deleted-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values (
  'ad002001-0000-4000-8000-000000000001'::uuid,
  'ad001001-0000-4000-8000-000000000001'::uuid,
  'ad000001-0000-4000-8000-000000000001'::uuid
);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values (
  'ad003001-0000-4000-8000-000000000001'::uuid,
  'ad000001-0000-4000-8000-000000000001'::uuid,
  'ad001001-0000-4000-8000-000000000001'::uuid,
  'ad002001-0000-4000-8000-000000000001'::uuid,
  'AD Owner',
  'AD Owner'
);

-- `created_at` is set 10 days back so the `ageDays` assertion has a value that
-- is not zero and cannot be produced by an accidental default.
insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type, created_at)
values (
  'ad007001-0000-4000-8000-000000000001'::uuid,
  'ad001001-0000-4000-8000-000000000001'::uuid,
  'ad000001-0000-4000-8000-000000000001'::uuid,
  'ad003001-0000-4000-8000-000000000001'::uuid,
  'ad dataset',
  'csv_file',
  now() - interval '10 days'
);

-- `is_public` is generated from `visibility`, so a public fixture is declared
-- through `visibility` and needs the settled `snapshot_revision` that
-- `dashboards__settled_snapshot_consistent` requires of a published dashboard.
insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, visibility, snapshot_revision, created_at)
values (
  'ad005001-0000-4000-8000-000000000001'::uuid,
  'ad001001-0000-4000-8000-000000000001'::uuid,
  'ad000001-0000-4000-8000-000000000001'::uuid,
  'ad003001-0000-4000-8000-000000000001'::uuid,
  'ad dashboard',
  '{}'::jsonb,
  'public'::public.dashboard_visibility,
  'ad006001-0000-4000-8000-000000000001'::uuid,
  now() - interval '3 days'
);

select plan(9);

select has_function(
  'public',
  'datasets__log_deleted_analytics_event',
  'the datasets delete emitter exists'
);

select has_function(
  'public',
  'dashboards__log_deleted_analytics_event',
  'the dashboards delete emitter exists'
);

delete from public.datasets
where id = 'ad007001-0000-4000-8000-000000000001'::uuid;

delete from public.dashboards
where id = 'ad005001-0000-4000-8000-000000000001'::uuid;

select is(
  (
    select count(*)
    from public.usage_analytics_events
    where event_name = 'dataset.deleted'
      and payload ->> 'datasetId' = 'ad007001-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'deleting a dataset records exactly one dataset.deleted event'
);

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'dataset.deleted'
      and payload ->> 'datasetId' = 'ad007001-0000-4000-8000-000000000001'
  ),
  jsonb_build_object(
    'datasetId', 'ad007001-0000-4000-8000-000000000001',
    'sourceType', 'csv_file',
    'ageDays', 10
  ),
  'the dataset payload carries the id, source type, and whole-day age, and no name'
);

select is(
  (
    select app::text
    from public.usage_analytics_events
    where event_name = 'dataset.deleted'
      and payload ->> 'datasetId' = 'ad007001-0000-4000-8000-000000000001'
  ),
  'data_sources',
  'the dataset event is attributed to the data_sources app'
);

select is(
  (
    select event_category::text
    from public.usage_analytics_events
    where event_name = 'dataset.deleted'
      and payload ->> 'datasetId' = 'ad007001-0000-4000-8000-000000000001'
  ),
  'expansion',
  'dataset.deleted is categorised as expansion, the shrink bucket'
);

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'dashboard.deleted'
      and payload ->> 'dashboardId' = 'ad005001-0000-4000-8000-000000000001'
  ),
  jsonb_build_object(
    'dashboardId', 'ad005001-0000-4000-8000-000000000001',
    'wasPublic', true,
    'ageDays', 3
  ),
  'the dashboard payload records public visibility at the time of deletion'
);

select is(
  (
    select workspace_id
    from public.usage_analytics_events
    where event_name = 'dashboard.deleted'
      and payload ->> 'dashboardId' = 'ad005001-0000-4000-8000-000000000001'
  ),
  'ad001001-0000-4000-8000-000000000001'::uuid,
  'the event is scoped to the deleted resource workspace'
);

-- A service-role delete has no `auth.uid()`. The event must still be recorded
-- rather than dropped, because a script deletion is exactly the path client
-- instrumentation would miss.
select is(
  (
    select user_id
    from public.usage_analytics_events
    where event_name = 'dashboard.deleted'
      and payload ->> 'dashboardId' = 'ad005001-0000-4000-8000-000000000001'
  ),
  null,
  'a delete with no authenticated actor is still recorded, with a null user_id'
);

select * from finish();

rollback;
