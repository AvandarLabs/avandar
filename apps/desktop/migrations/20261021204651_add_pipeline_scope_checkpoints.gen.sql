-- Generated from supabase/migrations/20261021204651_add_pipeline_scope_checkpoints.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 1
-- Statements dropped (RLS/funcs/triggers/data/etc.): 9
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
ALTER TABLE "data_catalog_listings" ADD COLUMN "pipeline_scope_keys" TEXT NOT NULL;
