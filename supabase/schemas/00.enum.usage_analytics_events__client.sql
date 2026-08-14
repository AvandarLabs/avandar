-- Which runtime emitted a usage analytics event.
--
-- `web` and `desktop` are set by `AnalyticsClient` in the browser and in the
-- Electrobun desktop shell. `server` is set by the edge-function analytics
-- helper. `db` is set by `public.util__log_analytics_event`, which only
-- Postgres triggers call.
create type public.usage_analytics_events__client as enum(
  'web',
  'desktop',
  'server',
  'db'
);
