-- Generated from supabase/migrations/20260815022608_add_dashboard_snapshot_revision.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 1
-- Statements dropped (RLS/funcs/triggers/data/etc.): 5
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
-- SQLite override. The Postgres migration backfills a reserved legacy revision with
-- UPDATE, which the schema-only generator intentionally drops. Desktop must
-- apply the same data transition so existing published rows keep reading their
-- unversioned snapshot objects after the revision column is introduced.
--
alter table "dashboards" add column "snapshot_revision" text;

update "dashboards"
set "snapshot_revision" = '00000000-0000-0000-0000-000000000000'
where "visibility" <> 'draft' and "snapshot_revision" is null;
