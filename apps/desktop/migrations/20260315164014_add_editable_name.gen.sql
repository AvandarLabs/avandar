-- Generated from supabase/migrations/20260315164014_add_editable_name.sql by
-- apps/desktop/scripts/gen-sqlite-migrations.ts. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 1
-- Statements dropped (RLS/funcs/triggers/data/etc.): 9
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 1
ALTER TABLE "dataset_columns" ADD COLUMN "original_name" TEXT;
