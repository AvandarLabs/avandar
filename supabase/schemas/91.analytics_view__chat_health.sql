-- Daily chat health: volume, the local versus cloud split, retry pressure,
-- outcome mix, and failure rate.
--
-- `local_messages_sent` is the only way to observe on-device chat. A local turn
-- never reaches the server, so it produces a `chat.message_sent` from the
-- client and nothing else, forever. Comparing it against `turns_completed` is
-- how the two runtimes are sized against each other.
--
-- Every column sourced from `chat.turn_completed` or `chat.turn_failed` stays
-- null or zero until server instrumentation records those events. The stable
-- columns let that instrumentation arrive without changing this view.
--
-- `avg_attempt_count` exposes how often the three-attempt escalation in
-- `PostChatMessages` fires, which is invisible today.
create or replace view analytics.chat_health as
with
  daily as (
    select
      date_trunc(
        'day',
        e.created_at
      )::date as activity_date,
      count(*) filter (
        where
          e.event_name = 'chat.message_sent'
      ) as messages_sent,
      count(*) filter (
        where
          e.event_name = 'chat.message_sent' and
          e.payload ->> 'runtimeMode' = 'local'
      ) as local_messages_sent,
      count(*) filter (
        where
          e.event_name = 'chat.message_sent' and
          e.payload ->> 'runtimeMode' = 'cloud'
      ) as cloud_messages_sent,
      count(*) filter (
        where
          e.event_name = 'chat.turn_completed'
      ) as turns_completed,
      count(*) filter (
        where
          e.event_name = 'chat.turn_failed'
      ) as turns_failed,
      avg(
        (
          e.payload ->> 'attemptCount'
        )::numeric
      ) filter (
        where
          e.event_name = 'chat.turn_completed'
      ) as avg_attempt_count,
      max(
        (
          e.payload ->> 'attemptCount'
        )::numeric
      ) filter (
        where
          e.event_name = 'chat.turn_completed'
      ) as max_attempt_count,
      percentile_cont(0.5) within group (
        order by
          (
            e.payload ->> 'latencyMs'
          )::numeric
      ) filter (
        where
          e.event_name = 'chat.turn_completed'
      ) as median_latency_ms,
      count(*) filter (
        where
          e.event_name = 'chat.turn_failed'
      )::numeric / nullif(
        count(*) filter (
          where
            e.event_name in (
              'chat.turn_completed',
              'chat.turn_failed'
            )
        ),
        0
      ) as failure_rate
    from
      public.usage_analytics_events e
    where
      e.event_name in (
        'chat.message_sent',
        'chat.turn_completed',
        'chat.turn_failed'
      )
    group by
      1
  ),
  outcomes as (
    select
      date_trunc(
        'day',
        e.created_at
      )::date as activity_date,
      coalesce(
        e.payload ->> 'outcome',
        'unknown'
      ) as outcome,
      count(*) as outcome_count
    from
      public.usage_analytics_events e
    where
      e.event_name = 'chat.turn_completed'
    group by
      1,
      2
  ),
  outcome_mixes as (
    select
      activity_date,
      jsonb_object_agg(
        outcome,
        outcome_count
      ) as outcome_mix
    from
      outcomes
    group by
      1
  )
select
  d.activity_date,
  d.messages_sent,
  d.local_messages_sent,
  d.cloud_messages_sent,
  d.turns_completed,
  d.turns_failed,
  d.avg_attempt_count,
  d.max_attempt_count,
  d.median_latency_ms,
  d.failure_rate,
  om.outcome_mix
from
  daily d
  left join outcome_mixes om on om.activity_date = d.activity_date
order by
  d.activity_date desc;

grant
select
  on analytics.chat_health to service_role;
