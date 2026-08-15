-- Generated from supabase/migrations/20260815042008_durable_dashboard_snapshot_transitions.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 5
-- Statements dropped (RLS/funcs/triggers/data/etc.): 6
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 1
-- SQLite override. SQLite has no enum types, and the desktop dashboard mirror is
-- read-only. The five nullable TEXT columns preserve the durable transition
-- state exactly; historical rows remain deterministically idle as NULL.
--
alter table "dashboards" add column "snapshot_transition_kind" text;
alter table "dashboards" add column "snapshot_transition_prior_revision" text;
alter table "dashboards" add column "snapshot_transition_prior_visibility" text;
alter table "dashboards" add column "snapshot_transition_revision" text;
alter table "dashboards" add column "snapshot_transition_target_visibility" text;
