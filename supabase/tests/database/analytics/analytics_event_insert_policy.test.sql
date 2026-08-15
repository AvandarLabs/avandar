-- Proves browser-authenticated analytics writers cannot impersonate trusted
-- database and server emitters or control database-owned columns.

\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values (
  'b6000001-0000-4000-8000-000000000001'::uuid,
  'analytics_writer@test.dev',
  'authenticated',
  'authenticated'
),
(
  'b6000002-0000-4000-8000-000000000002'::uuid,
  'analytics_outsider@test.dev',
  'authenticated',
  'authenticated'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'b6001001-0000-4000-8000-000000000001'::uuid,
  'b6000001-0000-4000-8000-000000000001'::uuid,
  'analytics policy workspace',
  'analytics-policy-workspace'
),
(
  'b6001002-0000-4000-8000-000000000002'::uuid,
  'b6000002-0000-4000-8000-000000000002'::uuid,
  'analytics outsider workspace',
  'analytics-outsider-workspace'
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values (
  'b6002001-0000-4000-8000-000000000001'::uuid,
  'b6001001-0000-4000-8000-000000000001'::uuid,
  'b6000001-0000-4000-8000-000000000001'::uuid
);

select plan(8);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"b6000001-0000-4000-8000-000000000001"}',
  true
);

select lives_ok(
  $$
    insert into public.usage_analytics_events (
      event_name,
      workspace_id,
      user_id,
      client
    ) values (
      'query.ran',
      'b6001001-0000-4000-8000-000000000001'::uuid,
      'b6000001-0000-4000-8000-000000000001'::uuid,
      'web'
    )
  $$,
  'an authenticated member can record a client-owned event'
);

select throws_ok(
  $$
    insert into public.usage_analytics_events (
      event_name,
      workspace_id,
      user_id,
      client
    ) values (
      'query.ran',
      'b6001002-0000-4000-8000-000000000002'::uuid,
      'b6000001-0000-4000-8000-000000000001'::uuid,
      'web'
    )
  $$,
  '42501',
  null,
  'an authenticated user cannot record an event for another workspace'
);

select throws_ok(
  $$
    insert into public.usage_analytics_events (
      event_name,
      workspace_id,
      user_id,
      client
    ) values (
      'subscription.status_changed',
      null,
      null,
      'db'
    )
  $$,
  '42501',
  null,
  'an authenticated user cannot forge a database event'
);

select throws_ok(
  $$
    insert into public.usage_analytics_events (
      event_name,
      workspace_id,
      user_id,
      client
    ) values (
      'chat.turn_failed',
      'b6001001-0000-4000-8000-000000000001'::uuid,
      'b6000001-0000-4000-8000-000000000001'::uuid,
      'web'
    )
  $$,
  '42501',
  null,
  'an authenticated user cannot forge a server-owned event name'
);

select throws_ok(
  $$
    insert into public.usage_analytics_events (
      event_name,
      workspace_id,
      user_id,
      client
    ) values (
      'query.ran',
      'b6001001-0000-4000-8000-000000000001'::uuid,
      'b6000001-0000-4000-8000-000000000001'::uuid,
      'server'
    )
  $$,
  '42501',
  null,
  'an authenticated user cannot claim the server client'
);

select throws_ok(
  $$
    insert into public.usage_analytics_events (
      event_name,
      workspace_id,
      user_id,
      client
    ) values (
      'query.ran',
      'b6001001-0000-4000-8000-000000000001'::uuid,
      null,
      'web'
    )
  $$,
  '42501',
  null,
  'an authenticated user cannot record an unattributed client event'
);

select throws_ok(
  $$
    insert into public.usage_analytics_events (
      event_name,
      workspace_id,
      user_id,
      client,
      created_at
    ) values (
      'query.ran',
      'b6001001-0000-4000-8000-000000000001'::uuid,
      'b6000001-0000-4000-8000-000000000001'::uuid,
      'web',
      now() - interval '1 year'
    )
  $$,
  '42501',
  null,
  'an authenticated user cannot control the event timestamp'
);

set local role postgres;

select is(
  (
    select event_category
    from public.usage_analytics_events
    where event_name = 'query.ran' and
      user_id = 'b6000001-0000-4000-8000-000000000001'::uuid
  ),
  'activation'::public.usage_analytics_events__category,
  'the database categorizes an allowed client event'
);

select * from finish();

rollback;
