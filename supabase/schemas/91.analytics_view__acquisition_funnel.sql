-- Weekly acquisition funnel: registered, email confirmed, first workspace
-- created.
--
-- Every step is bucketed by the week the user registered, which makes this a
-- cohort rather than a weekly activity count. A user who registers in week 1
-- and creates a workspace in week 3 is counted in week 1 for both, so the row
-- reads as a conversion rate.
create or replace view analytics.acquisition_funnel as
with
  registrations as (
    select
      e.user_id,
      min(e.created_at) as registered_at
    from
      public.usage_analytics_events e
    where
      e.event_name = 'user.registered' and
      e.user_id is not null
    group by
      1
  ),
  confirmations as (
    select
      e.user_id
    from
      public.usage_analytics_events e
    where
      e.event_name = 'user.email_confirmed' and
      e.user_id is not null
    group by
      1
  ),
  first_workspaces as (
    select
      e.user_id
    from
      public.usage_analytics_events e
    where
      e.event_name = 'workspace.created' and
      e.user_id is not null
    group by
      1
  ),
  user_weeks as (
    select
      date_trunc('week', r.registered_at) as cohort_week,
      count(*) as users_registered,
      count(c.user_id) as users_email_confirmed,
      count(w.user_id) as users_created_workspace
    from
      registrations r
      left join confirmations c on c.user_id = r.user_id
      left join first_workspaces w on w.user_id = r.user_id
    group by
      1
  )
select
  u.cohort_week,
  u.users_registered,
  u.users_email_confirmed,
  u.users_created_workspace
from
  user_weeks u
order by
  1 desc;

grant
select
  on analytics.acquisition_funnel to service_role;
