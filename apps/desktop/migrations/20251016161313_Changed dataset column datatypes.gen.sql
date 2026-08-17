-- Generated from supabase/migrations/20251016161313_Changed dataset column datatypes.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 14
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 2
ALTER TABLE "dataset_columns" ADD COLUMN "original_data_type" TEXT NOT NULL;

ALTER TABLE "dataset_columns" ADD COLUMN "detected_data_type" "datasets__duckdb_data_type" NOT NULL;
