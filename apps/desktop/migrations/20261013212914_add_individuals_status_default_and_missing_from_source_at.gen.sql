-- Generated from supabase/migrations/20261013212914_add_individuals_status_default_and_missing_from_source_at.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 1
-- Statements dropped (RLS/funcs/triggers/data/etc.): 0
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 1
ALTER TABLE "individuals" ADD COLUMN "missing_from_source_at" TIMESTAMPTZ;
