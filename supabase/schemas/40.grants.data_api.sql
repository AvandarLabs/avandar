-- Table privileges for the three Data API roles.
--
-- WHY THIS FILE EXISTS
--
-- Every privilege here used to be handed out invisibly. Supabase's local
-- bootstrap ran
--
--   alter default privileges in schema public grant all on tables
--     to postgres, anon, authenticated, service_role;
--
-- so a `create table` silently granted all seven privileges to all three
-- roles, and nobody ever had to write a grant down. Supabase CLI 2.114.0
-- reversed that default: new tables in `public` are no longer auto-exposed,
-- and the `[api] auto_expose_new_tables` opt-out is deleted on 2026-10-30.
--
-- Two consequences, both of which this file fixes:
--
-- 1. A new table now arrives with no SELECT, INSERT, UPDATE or DELETE, so
--    PostgREST refuses every request against it no matter how correct its RLS
--    is. The failure is silent until runtime.
-- 2. `supabase db diff` compared a live database full of inherited privileges
--    against a declarative schema that mentioned none, and proposed revoking
--    them from every table. A 930-line migration for a 10-line change.
--
-- Declaring the privileges is what makes the declarative schema honest. It is
-- also the only fix that survives the opt-out being removed.
--
-- WHY A SEPARATE FILE
--
-- Grants are a cross-cutting exposure surface, and the question worth being
-- able to answer in one place is "what can an anonymous visitor touch". This
-- follows the same split the repo already uses for `07.rls.*` and `17.rls.*`,
-- where policy lives apart from the table definition.
--
-- WHAT IS DELIBERATELY ABSENT
--
-- TRUNCATE, REFERENCES and TRIGGER. The narrowed default still grants those
-- three to all three roles on every new table, so naming them here would
-- change nothing, and revoking them would fight the default forever. Neither
-- is reachable through PostgREST: TRUNCATE has no REST verb, REFERENCES and
-- TRIGGER only matter for DDL, which none of these roles may perform.
--
-- `usage_analytics_events` is also absent. It owns its own grants in
-- `30.usage_analytics_events.sql`, where table-level INSERT is deliberately
-- revoked and replaced with column-level INSERT so a client cannot backdate an
-- event. Repeating a table-level grant here would undo that.
--
-- HOW TO EXTEND
--
-- A new table needs a line here, or it will be unreachable. Grant the
-- privileges its RLS policies actually contemplate: a grant without a matching
-- policy buys nothing, and a policy without a matching grant fails as
-- "permission denied" long before RLS is consulted.
------------------------------------------------------------------------------
-- anon
--
-- One table. `anon` reaches exactly one thing in `public`: the row behind a
-- public dashboard link, guarded by the "Anon can read public dashboards"
-- policy. Everything else an anonymous visitor loads comes from
-- `storage.objects`, whose own policies cover it and whose schema was never
-- narrowed.
--
-- Before this file `anon` held all seven privileges on all 29 public tables,
-- including DELETE and TRUNCATE on `workspaces`. Only RLS stood in the way.
grant
select
  on table public.dashboards to anon;

------------------------------------------------------------------------------
-- authenticated
--
-- Each grant matches the commands that table's policies actually allow.
-- Read-only tables are written by the backend under `service_role`.
grant
select
  on table public.catalog_entries__dataset_column to authenticated;

grant
select
  on table public.catalog_entries__open_data to authenticated;

grant
select
  on table public.subscriptions to authenticated;

-- No UPDATE: membership rows are added and removed, never edited in place.
grant
select
,
  insert,
  delete on table public.user_group_memberships to authenticated;

grant
select
,
  insert,
update,
  delete on table public.dashboards to authenticated;

grant
select
,
  insert,
update,
  delete on table public.dataset_columns to authenticated;

grant
select
,
  insert,
update,
  delete on table public.datasets to authenticated;

grant
select
,
  insert,
update,
  delete on table public.datasets__csv_file to authenticated;

grant
select
,
  insert,
update,
  delete on table public.datasets__google_sheets to authenticated;

grant
select
,
  insert,
update,
  delete on table public.datasets__open_data to authenticated;

grant
select
,
  insert,
update,
  delete on table public.datasets__virtual to authenticated;

grant
select
,
  insert,
update,
  delete on table public.datasets__xlsx_file to authenticated;

grant
select
,
  insert,
update,
  delete on table public.dexie_dbs to authenticated;

grant
select
,
  insert,
update,
  delete on table public.entities to authenticated;

grant
select
,
  insert,
update,
  delete on table public.entity_configs to authenticated;

grant
select
,
  insert,
update,
  delete on table public.entity_field_configs to authenticated;

grant
select
,
  insert,
update,
  delete on table public.resource_shares to authenticated;

grant
select
,
  insert,
update,
  delete on table public.role_group_app_roles to authenticated;

grant
select
,
  insert,
update,
  delete on table public.role_groups to authenticated;

grant
select
,
  insert,
update,
  delete on table public.tokens__google to authenticated;

grant
select
,
  insert,
update,
  delete on table public.user_groups to authenticated;

grant
select
,
  insert,
update,
  delete on table public.user_profiles to authenticated;

grant
select
,
  insert,
update,
  delete on table public.value_extractors__dataset_column_value to authenticated;

grant
select
,
  insert,
update,
  delete on table public.value_extractors__manual_entry to authenticated;

grant
select
,
  insert,
update,
  delete on table public.workspace_invites to authenticated;

grant
select
,
  insert,
update,
  delete on table public.workspace_memberships to authenticated;

grant
select
,
  insert,
update,
  delete on table public.workspaces to authenticated;

------------------------------------------------------------------------------
-- service_role
--
-- Full DML on everything, stated once rather than per table.
--
-- This role is the trusted backend key. It never reaches a browser, it already
-- bypasses RLS by design, and edge functions, the seed script and the e2e
-- admin client all write through it. Narrowing it would add breakage risk
-- without closing any hole: anyone holding the key can already read and write
-- whatever its grants allow.
--
-- `on all tables in schema public` is evaluated when this file runs, which is
-- after every table exists, so a new table is covered without another edit.
grant
select
,
  insert,
update,
  delete on all tables in schema public to service_role;
