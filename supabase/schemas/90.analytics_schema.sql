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
-- They are semantically no-ops. The only differences between the live
-- definition and the one `db diff` wants to install are in how Postgres RENDERS
-- the stored parse tree, not in what it means:
--
--   - schema qualification: `from usage_analytics_events` against
--     `from public.usage_analytics_events`. Qualification is chosen at render
--     time from `search_path`; it is not stored, so it cannot be fixed by
--     editing the SQL below.
--   - parenthesis nesting inside `filter (where ...)`, which differs between
--     `pg_get_viewdef`'s pretty and non-pretty forms.
--
-- Everything that would make a recreation risky was checked and is absent:
-- the views hold no data, `relacl` is null on both sides so no privilege
-- changes ride along, and no analytics view depends on another so nothing
-- cascades.
--
-- This is the "some view recreation cases" entry in the declarative-schema
-- caveats. Do not hand-trim it from a migration. Trimming a generated
-- migration by hand is what previously hid a real privilege bug, and the
-- statements here are the harmless ones.
revoke all on schema analytics
from
  public,
  anon,
  authenticated;

grant usage on schema analytics to service_role;
