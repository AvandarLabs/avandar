-- Replace the boolean `is_public` with a three-state `visibility` enum, and
-- bring `is_public` back as a stored generated column so every existing
-- read-side consumer keeps working untouched.
--
-- This migration includes two operations a schema diff cannot infer:
--
--   1. The `update` backfill below. `db diff` compares schema, never data, so
--      it emits no DML. Without this statement every dashboard that is public
--      today silently becomes a draft, un-publishing the entire product.
--   2. The drop/recreate of the anon policy and the slug index. Both depend on
--      `is_public`, so Postgres refuses to drop the column while they exist.
--
-- The declarative sources in `supabase/schemas/` remain the source of truth.
--
drop policy if exists "Anon can read public dashboards" on public.dashboards;

drop index if exists public.dashboards__slug_unique_when_public;

create type public.dashboard_visibility as enum(
  'draft',
  'workspace',
  'public'
);

alter table public.dashboards
add column visibility public.dashboard_visibility not null default 'draft';

-- The backfill. Everything currently public becomes 'public'; everything else
-- is a draft, which is what `is_public = false` meant.
update public.dashboards
set
  visibility = 'public'::public.dashboard_visibility
where
  is_public = true;

alter table public.dashboards
drop column is_public;

alter table public.dashboards
add column is_public boolean generated always as (
  visibility = 'public'::public.dashboard_visibility
) stored not null;

-- Recreated verbatim from supabase/schemas/17.rls.dashboards.sql. `is_public`
-- still exists and still means the same thing, so the policy body is unchanged.
create policy "Anon can read public dashboards" on public.dashboards for
select
  to anon using (
    public.dashboards.is_public = true
  );

create unique index dashboards__slug_unique_when_public on public.dashboards (slug)
where
  visibility = 'public'::public.dashboard_visibility and
  slug is not null;

create unique index dashboards__slug_unique_per_workspace_when_internal on public.dashboards (
  workspace_id,
  slug
)
where
  visibility = 'workspace'::public.dashboard_visibility and
  slug is not null;
