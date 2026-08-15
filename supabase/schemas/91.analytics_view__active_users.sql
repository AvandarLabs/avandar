-- Daily and rolling seven-day active users, split by the runtime that emitted
-- the events.
--
-- The split by `client` is the only way to see desktop adoption separately, and
-- `runtimeMode` on chat events cannot substitute for it: a desktop build can
-- run cloud chat and the browser cannot run local chat at all.
--
-- The weekly figure is a rolling seven-day window ending on `activity_date`,
-- not a calendar week, so the two columns are comparable on any given day.
-- `event_category = 'engagement'` is what defines "active": importing a dataset
-- is activation, not engagement, and counting it here would make a one-time
-- setup look like a returning user.
create or replace view analytics.active_users as
with
  daily_actives as (
    select
      date_trunc(
        'day',
        e.created_at
      )::date as activity_date,
      e.client,
      e.user_id
    from
      public.usage_analytics_events e
    where
      e.event_category = 'engagement' and
      e.user_id is not null
    group by
      1,
      2,
      3
  ),
  reporting_dates as (
    select
      generate_series(
        min(
          activity_date
        ),
        current_date,
        interval '1 day'
      )::date as activity_date
    from
      daily_actives
  ),
  clients as (
    select distinct
      client
    from
      daily_actives
  ),
  reporting_days as (
    select
      d.activity_date,
      c.client
    from
      reporting_dates d
      cross join clients c
  )
select
  d.activity_date,
  d.client,
  count(
    distinct a.user_id
  ) filter (
    where
      a.activity_date = d.activity_date
  ) as daily_active_users,
  count(
    distinct a.user_id
  ) as weekly_active_users
from
  reporting_days d
  left join daily_actives a on a.client = d.client and
  a.activity_date <= d.activity_date and
  a.activity_date > d.activity_date - 7
group by
  d.activity_date,
  d.client
order by
  d.activity_date desc,
  d.client;

grant
select
  on analytics.active_users to service_role;
