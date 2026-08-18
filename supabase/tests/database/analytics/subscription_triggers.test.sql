-- Covers `subscription.created`, `subscription.plan_changed`, and
-- `subscription.status_changed`.
--
-- Triggers on `subscriptions` cover both the native free path in
-- `supabase/functions/subscriptions/create-free.ts` and every Polar webhook,
-- without touching either. The webhook handler performs a blind UPDATE and
-- never reads the previous row, so the previous plan and status are only
-- knowable from OLD, which is what makes this a trigger rather than edge code.

\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role, created_at)
values (
  'b4000001-0000-4000-8000-000000000001'::uuid,
  'sb_owner@test.dev',
  'authenticated',
  'authenticated',
  now() - interval '30 days'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'b4001001-0000-4000-8000-000000000001'::uuid,
  'b4000001-0000-4000-8000-000000000001'::uuid,
  'sb workspace',
  'sb-subscription-triggers-ws'
);

select plan(7);

select ok(
  public.util__subscription_plan_rank('free') <
  public.util__subscription_plan_rank('basic') and
  public.util__subscription_plan_rank('basic') <
  public.util__subscription_plan_rank('premium'),
  'the plan ranking orders free below basic below premium'
);

insert into public.subscriptions (
  id,
  workspace_id,
  subscription_owner_id,
  feature_plan_type,
  subscription_status,
  max_seats_allowed
)
values (
  'b4002001-0000-4000-8000-000000000001'::uuid,
  'b4001001-0000-4000-8000-000000000001'::uuid,
  'b4000001-0000-4000-8000-000000000001'::uuid,
  'free',
  'active',
  3
);

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'subscription.created'
      and workspace_id = 'b4001001-0000-4000-8000-000000000001'::uuid
  ),
  jsonb_build_object(
    'plan', 'free',
    'isPolarBacked', false,
    'status', 'active'
  ),
  'a native free subscription is recorded as created and not Polar-backed'
);

select is(
  (
    select event_category::text
    from public.usage_analytics_events
    where event_name = 'subscription.created'
      and workspace_id = 'b4001001-0000-4000-8000-000000000001'::uuid
  ),
  'revenue',
  'subscription.created is categorised as revenue'
);

update public.subscriptions
set feature_plan_type = 'premium',
  max_seats_allowed = 10,
  polar_subscription_id = 'b4003001-0000-4000-8000-000000000001'::uuid
where id = 'b4002001-0000-4000-8000-000000000001'::uuid;

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'subscription.plan_changed'
      and workspace_id = 'b4001001-0000-4000-8000-000000000001'::uuid
  ),
  jsonb_build_object(
    'fromPlan', 'free',
    'toPlan', 'premium',
    'direction', 'upgrade',
    'seats', 10
  ),
  'moving up the plan ordering is classified as an upgrade'
);

update public.subscriptions
set feature_plan_type = 'basic'
where id = 'b4002001-0000-4000-8000-000000000001'::uuid;

select is(
  (
    select payload ->> 'direction'
    from public.usage_analytics_events
    where event_name = 'subscription.plan_changed'
      and payload ->> 'toPlan' = 'basic'
  ),
  'downgrade',
  'moving down the plan ordering is classified as a downgrade'
);

update public.subscriptions
set subscription_status = 'canceled'
where id = 'b4002001-0000-4000-8000-000000000001'::uuid;

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'subscription.status_changed'
      and workspace_id = 'b4001001-0000-4000-8000-000000000001'::uuid
  ),
  jsonb_build_object(
    'fromStatus', 'active',
    'toStatus', 'canceled',
    'plan', 'basic'
  ),
  'cancellation is recorded as a status change carrying the plan it left from'
);

-- An update that touches neither the plan nor the status must record nothing,
-- or the `updated_at` bump on every webhook would flood the revenue funnel.
update public.subscriptions
set max_dashboards_allowed = 25
where id = 'b4002001-0000-4000-8000-000000000001'::uuid;

select is(
  (
    select count(*)
    from public.usage_analytics_events
    where event_name in (
      'subscription.plan_changed',
      'subscription.status_changed'
    )
      and workspace_id = 'b4001001-0000-4000-8000-000000000001'::uuid
  ),
  3::bigint,
  'an update that changes neither plan nor status records nothing new'
);

select * from finish();

rollback;
