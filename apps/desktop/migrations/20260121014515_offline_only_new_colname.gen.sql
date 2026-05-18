-- Generated from supabase/migrations/20260121014515_offline_only_new_colname.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 7
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
alter table "datasets__csv_file"
drop column "offline_only";

alter table "datasets__csv_file"
add column "is_in_cloud_storage" integer default false;
