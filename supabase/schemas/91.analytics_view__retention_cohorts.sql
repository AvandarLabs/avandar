-- Weekly registration cohorts against weekly sign-ins.
--
-- One row per (cohort week, weeks since registration), so week 0 is the
-- registration week itself and the ratio of `returning_users` to `cohort_size`
-- down a cohort is the retention curve.
--
-- `median_days_since_last_sign_in` comes from the `daysSinceLastSignIn` payload
-- that the `auth.users` update trigger records. It answers a different question
-- from the curve: not how many came back, but how long they stayed away. It is
-- null for week 0, where every sign-in is a first sign-in and the payload
-- field is null by design.
create or replace view analytics.retention_cohorts as
with
  cohorts as (
    select
      e.user_id,
      date_trunc(
        'week',
        min(
          e.created_at
        )
      ) as cohort_week
    from
      public.usage_analytics_events e
    where
      e.event_name = 'user.registered' and
      e.user_id is not null
    group by
      1
  ),
  cohort_sizes as (
    select
      cohort_week,
      count(*) as cohort_size
    from
      cohorts
    group by
      1
  ),
  cohort_weeks as (
    select
      cs.cohort_week,
      cs.cohort_size,
      generate_series(
        cs.cohort_week,
        date_trunc(
          'week',
          now()
        ),
        interval '1 week'
      ) as active_week
    from
      cohort_sizes cs
  ),
  sign_ins as (
    select
      e.user_id,
      date_trunc(
        'week',
        e.created_at
      ) as active_week,
      min(
        (
          e.payload ->> 'daysSinceLastSignIn'
        )::numeric
      ) as days_since_last_sign_in
    from
      public.usage_analytics_events e
    where
      e.event_name = 'user.signed_in' and
      e.user_id is not null
    group by
      1,
      2
  )
select
  w.cohort_week,
  (
    extract(
      epoch
      from
        (
          w.active_week - w.cohort_week
        )
    ) / 604800
  )::int as weeks_since_registration,
  w.cohort_size,
  count(
    distinct s.user_id
  ) as returning_users,
  percentile_cont(0.5) within group (
    order by
      s.days_since_last_sign_in
  ) as median_days_since_last_sign_in
from
  cohort_weeks w
  join cohorts c on c.cohort_week = w.cohort_week
  left join sign_ins s on s.user_id = c.user_id and
  s.active_week = w.active_week
group by
  w.cohort_week,
  2,
  w.cohort_size
order by
  w.cohort_week desc,
  2;

grant
select
  on analytics.retention_cohorts to service_role;
