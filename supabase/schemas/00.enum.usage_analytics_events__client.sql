/**
 * Which runtime emitted a usage analytics event.
 *
 * Enum values:
 *
 * `web` and `desktop` - Set by `AnalyticsClient` in the browser and in the
 *  Electrobun desktop shell.
 *
 * `server` - Set by the edge-function analytics helper.
 *
 * `db` - Set by `public.util__log_analytics_event`, which only Postgres
 *  triggers call.
 */
create type public.usage_analytics_events__client as enum('web', 'desktop', 'server', 'db');
