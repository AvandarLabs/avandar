-- The reporting schema.
--
-- Every view in `91.analytics_view__*.sql` lives here and aggregates events
-- across every workspace, so none of them may ever be reachable from the
-- browser. Three things keep that true, and all three are required:
--
-- 1. `analytics` is absent from `config.toml`'s `[api] schemas` list, so
--    PostgREST does not serve it at all. That is the structural guarantee.
-- 2. The views are owned by `postgres` and deliberately not `security_invoker`,
--    which is what lets them read past RLS for the service role. A view in
--    `public` without `security_invoker` would bypass RLS *and* be served by
--    PostgREST, which is the combination this schema exists to avoid.
-- 3. `anon` and `authenticated` are granted nothing here. The revokes below are
--    no-ops on a fresh schema, since Postgres 15 grants a new schema to nobody,
--    and they are written out anyway so the intent survives a future default
--    privilege being added.
--
-- Reads happen with the service role over a direct connection. There is no
-- in-app reader and no platform-admin concept anywhere in this schema.
create schema if not exists analytics;

revoke all on schema analytics
from
  public,
  anon,
  authenticated;

grant usage on schema analytics to service_role;
