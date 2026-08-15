-- Covers the `analytics` schema and its reporting views.
--
-- The single most important assertion in this file is the negative one: an
-- authenticated user must not be able to read these views. They aggregate every
-- workspace's events with no RLS in the way, because they are owned by
-- `postgres` and are deliberately not `security_invoker`. The schema being
-- absent from `config.toml` keeps PostgREST out; this proves the database
-- itself keeps a hand-crafted connection out too.
--
-- The seeded rows below are inserted straight into `usage_analytics_events`
-- with explicit `created_at` values, rather than produced by exercising the
-- triggers, because the views are what is under test here and fixed timestamps
-- are what make the weekly and monthly buckets assertable.

\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role, created_at)
values (
  'b5000001-0000-4000-8000-000000000001'::uuid,
  'rv_one@test.dev',
  'authenticated',
  'authenticated',
  now() - interval '30 days'
),
(
  'b5000002-0000-4000-8000-000000000002'::uuid,
  'rv_two@test.dev',
  'authenticated',
  'authenticated',
  now() - interval '30 days'
);

insert into public.workspaces (id, owner_id, name, slug, created_at)
values (
  'b5001001-0000-4000-8000-000000000001'::uuid,
  'b5000001-0000-4000-8000-000000000001'::uuid,
  'rv workspace',
  'rv-reporting-views-ws',
  now() - interval '30 days'
);

-- Clear the events the setup above emitted through the triggers, so every
-- assertion below counts only the rows this test seeds on purpose.
delete from public.usage_analytics_events;

insert into public.usage_analytics_events (
  event_name, workspace_id, user_id, client, payload, created_at
)
values
  -- Acquisition, all inside one registration cohort week.
  (
    'user.registered', null, 'b5000001-0000-4000-8000-000000000001'::uuid, 'db',
    '{"emailDomain": "acme.dev", "provider": "email", "hadPendingInvite": false}'::jsonb,
    date_trunc('week', now()) + interval '1 day'
  ),
  (
    'user.registered', null, 'b5000002-0000-4000-8000-000000000002'::uuid, 'db',
    '{"emailDomain": "acme.dev", "provider": "email", "hadPendingInvite": true}'::jsonb,
    date_trunc('week', now()) + interval '1 day'
  ),
  (
    'user.email_confirmed', null, 'b5000001-0000-4000-8000-000000000001'::uuid, 'db',
    '{"emailDomain": "acme.dev", "secondsToConfirm": 60}'::jsonb,
    date_trunc('week', now()) + interval '2 days'
  ),
  (
    'workspace.created',
    'b5001001-0000-4000-8000-000000000001'::uuid,
    'b5000001-0000-4000-8000-000000000001'::uuid, 'db',
    '{"isFirstWorkspaceForUser": true, "secondsSinceUserRegistered": 120}'::jsonb,
    date_trunc('week', now()) + interval '2 days'
  ),
  (
    'dataset.imported',
    'b5001001-0000-4000-8000-000000000001'::uuid,
    'b5000001-0000-4000-8000-000000000001'::uuid, 'web',
    '{"datasetId": "b5004001-0000-4000-8000-000000000001", "sourceType": "csv_file", "columnCount": 3, "rowCount": 10, "isFirstInWorkspace": true}'::jsonb,
    date_trunc('day', now()) + interval '8 hours'
  ),
  -- Engagement, one web user and one desktop user on the same day.
  (
    'chat.message_sent',
    'b5001001-0000-4000-8000-000000000001'::uuid,
    'b5000001-0000-4000-8000-000000000001'::uuid, 'web',
    '{"promptChars": 20, "pageApp": "data_explorer", "runtimeMode": "cloud", "hasOpenDataset": true}'::jsonb,
    date_trunc('day', now()) + interval '9 hours'
  ),
  (
    'chat.message_sent',
    'b5001001-0000-4000-8000-000000000001'::uuid,
    'b5000002-0000-4000-8000-000000000002'::uuid, 'desktop',
    '{"promptChars": 30, "pageApp": "data_explorer", "runtimeMode": "local", "hasOpenDataset": false}'::jsonb,
    date_trunc('day', now()) - interval '1 day' + interval '10 hours'
  ),
  -- Expansion, one invite sent and accepted.
  (
    'workspace.invite_sent',
    'b5001001-0000-4000-8000-000000000001'::uuid,
    'b5000001-0000-4000-8000-000000000001'::uuid, 'db',
    '{"inviteId": "b5003001-0000-4000-8000-000000000001", "invitedEmailDomain": "newco.dev", "inviteeAlreadyRegistered": false, "memberCountBefore": 1}'::jsonb,
    now() - interval '3 days'
  ),
  (
    'workspace.invite_accepted',
    'b5001001-0000-4000-8000-000000000001'::uuid,
    'b5000002-0000-4000-8000-000000000002'::uuid, 'db',
    '{"inviteId": "b5003001-0000-4000-8000-000000000001", "secondsFromInviteToAccept": 3600, "memberCountAfter": 2}'::jsonb,
    now() - interval '2 days'
  ),
  -- Revenue, one upgrade and one cancellation in the current month.
  (
    'subscription.plan_changed',
    'b5001001-0000-4000-8000-000000000001'::uuid,
    'b5000001-0000-4000-8000-000000000001'::uuid, 'db',
    '{"fromPlan": "free", "toPlan": "premium", "direction": "upgrade", "seats": 10}'::jsonb,
    date_trunc('month', now()) + interval '1 day'
  ),
  (
    'subscription.status_changed',
    'b5001001-0000-4000-8000-000000000001'::uuid,
    'b5000001-0000-4000-8000-000000000001'::uuid, 'db',
    '{"fromStatus": "active", "toStatus": "canceled", "plan": "premium"}'::jsonb,
    date_trunc('month', now()) + interval '2 days'
  );

select plan(11);

select has_schema('analytics', 'the analytics schema exists');

set local role authenticated;

select throws_ok(
  'select count(*) from analytics.acquisition_funnel',
  '42501',
  null,
  'an authenticated user cannot read a reporting view'
);

set local role postgres;

select ok(
  not exists (
    select 1
    from information_schema.table_privileges
    where table_schema = 'analytics' and
      grantee in ('PUBLIC', 'anon', 'authenticated')
  ),
  'no browser-reachable role holds a grant inside the analytics schema'
);

select is(
  (
    select jsonb_build_object(
      'usersRegistered', users_registered,
      'usersEmailConfirmed', users_email_confirmed,
      'usersCreatedWorkspace', users_created_workspace
    )
    from analytics.acquisition_funnel
    where cohort_week = date_trunc('week', now())
  ),
  jsonb_build_object(
    'usersRegistered', 2,
    'usersEmailConfirmed', 1,
    'usersCreatedWorkspace', 1
  ),
  'the acquisition funnel narrows correctly inside one week cohort'
);

select is(
  (
    select first_dataset_at
    from analytics.activation
    where workspace_id = 'b5001001-0000-4000-8000-000000000001'::uuid
  ),
  date_trunc('day', now()) + interval '8 hours',
  'activation reports the first dataset import for the workspace'
);

select is(
  (
    select jsonb_build_object(
      'wasAccepted', was_accepted,
      'secondsToAccept', seconds_to_accept
    )
    from analytics.invite_conversion
    where invite_id = 'b5003001-0000-4000-8000-000000000001'
  ),
  jsonb_build_object('wasAccepted', true, 'secondsToAccept', 3600),
  'invite_conversion joins sent to accepted on the invite id'
);

select is(
  (
    select jsonb_build_object(
      'upgrades', upgrades,
      'downgrades', downgrades,
      'cancellations', cancellations
    )
    from analytics.plan_movement
    where month = date_trunc('month', now())
  ),
  jsonb_build_object('upgrades', 1, 'downgrades', 0, 'cancellations', 1),
  'plan_movement counts an upgrade and a cancellation in the same month'
);

select is(
  (
    select count(*)
    from analytics.active_users
    where activity_date = date_trunc('day', now())::date and
      daily_active_users = 1
  ),
  1::bigint,
  'active_users reports the current web daily active user'
);

select is(
  (
    select jsonb_build_object(
      'dailyActiveUsers', daily_active_users,
      'weeklyActiveUsers', weekly_active_users
    )
    from analytics.active_users
    where activity_date = date_trunc('day', now())::date and
      client = 'desktop'
  ),
  jsonb_build_object('dailyActiveUsers', 0, 'weeklyActiveUsers', 1),
  'active_users keeps a rolling desktop row without same-day activity'
);

select is(
  (
    select jsonb_build_object(
      'messagesSent', messages_sent,
      'localMessagesSent', local_messages_sent,
      'cloudMessagesSent', cloud_messages_sent,
      'turnsCompleted', turns_completed,
      'turnsFailed', turns_failed
    )
    from analytics.chat_health
    where activity_date = date_trunc('day', now())::date
  ),
  jsonb_build_object(
    'messagesSent', 1,
    'localMessagesSent', 0,
    'cloudMessagesSent', 1,
    'turnsCompleted', 0,
    'turnsFailed', 0
  ),
  'chat_health separates local and cloud messages from server turn outcomes'
);

select is(
  (
    select jsonb_build_object(
      'cohortSize', cohort_size,
      'returningUsers', returning_users,
      'medianDaysSinceLastSignIn', median_days_since_last_sign_in
    )
    from analytics.retention_cohorts
    where cohort_week = date_trunc('week', now()) and
      weeks_since_registration = 0
  ),
  jsonb_build_object(
    'cohortSize', 2,
    'returningUsers', 0,
    'medianDaysSinceLastSignIn', null
  ),
  'retention_cohorts preserves a zero-return week'
);

select * from finish();

rollback;
