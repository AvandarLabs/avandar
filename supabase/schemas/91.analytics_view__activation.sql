-- Per-workspace activation: how long each workspace took to import its first
-- dataset, run its first query, and publish its first dashboard.
--
-- Built from `public.workspaces` with a LEFT JOIN rather than from the events
-- alone, so a workspace that has done nothing at all still appears with nulls.
-- A workspace missing from an activation report is the single most interesting
-- row in it.
--
-- `days_to_first_query` stays null until an emitter records `query.ran`. The
-- stable column lets that instrumentation arrive without changing this view.
create or replace view analytics.activation as
select
  w.id as workspace_id,
  w.created_at as workspace_created_at,
  min(e.created_at) filter (
    where
      e.event_name = 'dataset.imported'
  ) as first_dataset_at,
  min(e.created_at) filter (
    where
      e.event_name = 'query.ran'
  ) as first_query_at,
  min(e.created_at) filter (
    where
      e.event_name = 'dashboard.published'
  ) as first_dashboard_published_at,
  extract(
    epoch
    from
      (
        min(e.created_at) filter (
          where
            e.event_name = 'dataset.imported'
        ) - w.created_at
      )
  ) / 86400 as days_to_first_dataset,
  extract(
    epoch
    from
      (
        min(e.created_at) filter (
          where
            e.event_name = 'query.ran'
        ) - w.created_at
      )
  ) / 86400 as days_to_first_query,
  extract(
    epoch
    from
      (
        min(e.created_at) filter (
          where
            e.event_name = 'dashboard.published'
        ) - w.created_at
      )
  ) / 86400 as days_to_first_dashboard_published
from
  public.workspaces w
  left join public.usage_analytics_events e on e.workspace_id = w.id
group by
  w.id,
  w.created_at
order by
  w.created_at desc;

grant
select
  on analytics.activation to service_role;
