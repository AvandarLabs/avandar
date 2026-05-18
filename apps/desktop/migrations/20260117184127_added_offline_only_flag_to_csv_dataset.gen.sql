-- Generated from supabase/migrations/20260117184127_added_offline_only_flag_to_csv_dataset.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 1
-- Statements dropped (RLS/funcs/triggers/data/etc.): 3
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
ALTER TABLE "datasets__csv_file" ADD COLUMN "offline_only" INTEGER DEFAULT FALSE;
