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

-- KNOWN DIFF ARTIFACT, not a defect to chase.
--
-- Every `supabase db diff` emits a `drop view if exists` plus a
-- `create or replace view` for all seven `analytics.*` views, even when nothing
-- in this directory changed. Keep them in the generated migration.
--
-- They are semantically no-ops, and this was measured rather than assumed.
-- The stored definitions are the same on both sides; the ONLY difference is
-- schema qualification, which `pg_get_viewdef` decides at render time from
-- `search_path` and does not store:
--
--   search_path = public, extensions
--     -> from usage_analytics_events
--   search_path = pg_catalog
--     -> from public.usage_analytics_events
--
-- Rendered with `public` out of the path, the live definition is
-- byte-identical to the one `db diff` wants to install. So the diff compares
-- two renderings of one parse tree under different connection settings, not
-- two different views, and no edit to the SQL below can change it.
--
-- Everything that would make a recreation risky was checked and is absent: the
-- views hold no data, `relacl` is null on both sides so no privilege change
-- rides along, and no analytics view depends on another so nothing cascades.
--
-- This is the "some view recreation cases" entry in the declarative-schema
-- caveats. Leave the statements in the generated migration. Hand-editing a
-- generated migration means deciding by eye which of hundreds of statements are
-- legitimate, and a wrong call ships a database that no longer matches this
-- directory, which is the drift that caused the grant problem in the first
-- place. These particular statements are the harmless ones.
revoke all on schema analytics
from
  public,
  anon,
  authenticated;

grant usage on schema analytics to service_role;
