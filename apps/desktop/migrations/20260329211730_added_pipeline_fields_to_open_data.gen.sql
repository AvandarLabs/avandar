-- Generated from supabase/migrations/20260329211730_added_pipeline_fields_to_open_data.sql by
-- apps/desktop/scripts/gen-sqlite-migrations.ts. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
ALTER TABLE "catalog_entries__open_data" ADD COLUMN "pipeline_name" TEXT NOT NULL;

ALTER TABLE "catalog_entries__open_data" ADD COLUMN "pipeline_run_id" TEXT NOT NULL;
