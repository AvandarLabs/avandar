-- Generated from supabase/migrations/20260816020200_dashboard_snapshot_transitions.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 5
-- Statements dropped (RLS/funcs/triggers/data/etc.): 46
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 2
-- SQLite override. SQLite has no enum types, and the desktop dashboard mirror is
-- read-only. The five nullable TEXT columns preserve the durable transition
-- state exactly; historical rows remain deterministically idle as NULL. Column
-- order follows the Postgres migration.
--
-- `snapshot_transition_kind` mirrors the `dashboard_snapshot_transition_kind`
-- enum and the two `..._visibility` columns mirror `dashboard_visibility`;
-- all three are TEXT here for the same reason `visibility` is.
--
-- The Postgres migration also adds two CHECK constraints,
-- `dashboards__snapshot_transition_consistent` and
-- `dashboards__settled_snapshot_consistent` (each `not valid`, then a
-- `validate constraint` pass). Neither is mirrored, for two reasons: SQLite
-- cannot ALTER TABLE ADD CONSTRAINT at all, and the mirror has no write path,
-- so there is no INSERT or UPDATE for either invariant to constrain. Rows only
-- ever arrive from a Postgres that already enforced both. The `validate
-- constraint` statements are likewise dropped; they have no SQLite meaning.
--
alter table "dashboards" add column "snapshot_transition_kind" text;
alter table "dashboards" add column "snapshot_transition_revision" text;
alter table "dashboards" add column "snapshot_transition_prior_revision" text;
alter table "dashboards" add column "snapshot_transition_prior_visibility" text;
alter table "dashboards" add column "snapshot_transition_target_visibility" text;
