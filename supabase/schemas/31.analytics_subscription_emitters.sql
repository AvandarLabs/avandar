-- Analytics emitters for the revenue funnel.
--
-- These live here rather than in `07.subscriptions.sql` because they call
-- `public.util__log_analytics_event`, which `30.usage_analytics_events.sql`
-- defines, and schema files are applied in lexicographic order.
--
-- Triggers rather than edge code, for one specific reason:
-- `handleSubscriptionUpdatedEvent` in the Polar webhook performs a blind
-- UPDATE and never reads the row it is replacing, so the previous plan and the
-- previous status are only knowable from OLD. Instrumenting here also covers
-- the native free path in `supabase/functions/subscriptions/create-free.ts`
-- without touching either.
-- Orders the feature plans so a plan change is classified with one comparison.
--
-- Lives in this file rather than in a `00.` utility file because it takes the
-- `subscriptions__feature_plan_type` enum, which `07.subscriptions.sql` defines
-- long after the `00.` files are applied.
--
-- Returns null for a plan value that has not been ranked, which is what makes
-- the `lateral` branch below reachable: a plan added to the enum without being
-- ranked here shows up as `lateral` in reporting rather than being silently
-- counted as an upgrade.
--
-- @param p_plan: the feature plan
-- @returns: the plan's position in the free < basic < premium ordering
create or replace function public.util__subscription_plan_rank (
  p_plan public.subscriptions__feature_plan_type
) returns integer as $$
  select case p_plan
    when 'free' then 0
    when 'basic' then 1
    when 'premium' then 2
  end;
$$ language sql immutable
set
  search_path = '';

-- Records `subscription.created`.
--
-- `isPolarBacked` separates the native free subscriptions, which never touch
-- Polar, from billed ones, so revenue reporting can exclude the free rows
-- without hard-coding a plan name.
--
-- Plan and status are cast to text rather than passed as enums so the stored
-- JSON is a plain string in every case and reporting never has to care how
-- jsonb rendered an enum.
--
-- @returns: trigger
create or replace function public.subscriptions__log_created_analytics_event () returns trigger as $$
begin
  perform public.util__log_analytics_event(
    'subscription.created',
    new.workspace_id,
    new.subscription_owner_id,
    'settings'::public.app_type,
    jsonb_build_object(
      'plan', new.feature_plan_type::text,
      'isPolarBacked', new.polar_subscription_id is not null,
      'status', new.subscription_status::text
    )
  );
  return null;
exception
  when others then
    return null;
end;
$$ language plpgsql security definer
set
  search_path = '';

revoke
execute on function public.subscriptions__log_created_analytics_event ()
from
  public,
  anon,
  authenticated;

create trigger tr__subscriptions__log_created_analytics_event
after insert on public.subscriptions for each row
execute function public.subscriptions__log_created_analytics_event ();

-- Records `subscription.plan_changed` and `subscription.status_changed`.
--
-- One trigger emits both, because a single webhook-driven UPDATE can change the
-- plan and the status together and reading OLD once is enough for both.
--
-- Every other UPDATE records nothing. The `updated_at` bump fires on every
-- webhook, so guarding on `is distinct from` is what keeps the revenue funnel
-- from being flooded with non-events.
--
-- Churn is this event where `toStatus = 'canceled'`, which is how
-- `analytics.plan_movement` counts cancellations.
--
-- @returns: trigger
create or replace function public.subscriptions__log_updated_analytics_events () returns trigger as $$
begin
  if new.feature_plan_type is distinct from old.feature_plan_type then
    perform public.util__log_analytics_event(
      'subscription.plan_changed',
      new.workspace_id,
      new.subscription_owner_id,
      'settings'::public.app_type,
      jsonb_build_object(
        'fromPlan',
        old.feature_plan_type::text,
        'toPlan',
        new.feature_plan_type::text,
        'direction',
        case
          when public.util__subscription_plan_rank(new.feature_plan_type) >
          public.util__subscription_plan_rank(old.feature_plan_type) then 'upgrade'
          when public.util__subscription_plan_rank(new.feature_plan_type) <
          public.util__subscription_plan_rank(old.feature_plan_type) then 'downgrade'
          else 'lateral'
        end,
        'seats',
        new.max_seats_allowed
      )
    );
  end if;

  if new.subscription_status is distinct from old.subscription_status then
    perform public.util__log_analytics_event(
      'subscription.status_changed',
      new.workspace_id,
      new.subscription_owner_id,
      'settings'::public.app_type,
      jsonb_build_object(
        'fromStatus', old.subscription_status::text,
        'toStatus', new.subscription_status::text,
        'plan', new.feature_plan_type::text
      )
    );
  end if;

  return null;
exception
  when others then
    return null;
end;
$$ language plpgsql security definer
set
  search_path = '';

revoke
execute on function public.subscriptions__log_updated_analytics_events ()
from
  public,
  anon,
  authenticated;

create trigger tr__subscriptions__log_updated_analytics_events
after
update on public.subscriptions for each row
execute function public.subscriptions__log_updated_analytics_events ();
