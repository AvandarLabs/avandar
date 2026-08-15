-- Monthly subscription movement: new subscriptions, upgrades, downgrades, and
-- cancellations.
--
-- Churn is `subscription.status_changed` where `toStatus = 'canceled'`, which
-- is the only definition of churn in this codebase.
--
-- `lateral_moves` should always be zero. `direction` can only be `lateral` when
-- a plan has been added to `subscriptions__feature_plan_type` without being
-- ranked in `util__subscription_plan_rank`, so a non-zero value here is a
-- signal that the ranking function needs updating, not a business event.
create or replace view analytics.plan_movement as
select
  date_trunc(
    'month',
    e.created_at
  ) as month,
  count(*) filter (
    where
      e.event_name = 'subscription.created'
  ) as subscriptions_created,
  count(*) filter (
    where
      e.event_name = 'subscription.created' and
      (
        e.payload ->> 'isPolarBacked'
      )::boolean
  ) as polar_backed_subscriptions_created,
  count(*) filter (
    where
      e.event_name = 'subscription.plan_changed' and
      e.payload ->> 'direction' = 'upgrade'
  ) as upgrades,
  count(*) filter (
    where
      e.event_name = 'subscription.plan_changed' and
      e.payload ->> 'direction' = 'downgrade'
  ) as downgrades,
  count(*) filter (
    where
      e.event_name = 'subscription.plan_changed' and
      e.payload ->> 'direction' = 'lateral'
  ) as lateral_moves,
  count(*) filter (
    where
      e.event_name = 'subscription.status_changed' and
      e.payload ->> 'toStatus' = 'canceled'
  ) as cancellations
from
  public.usage_analytics_events e
where
  e.event_category = 'revenue'
group by
  1
order by
  1 desc;

grant
select
  on analytics.plan_movement to service_role;
