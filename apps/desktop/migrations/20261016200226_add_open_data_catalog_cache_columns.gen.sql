-- Generated from supabase/migrations/20261016200226_add_open_data_catalog_cache_columns.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 3
-- Statements dropped (RLS/funcs/triggers/data/etc.): 6
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 3
ALTER TABLE "catalog_entries__open_data" ADD COLUMN "cached_at" TIMESTAMPTZ;

ALTER TABLE "catalog_entries__open_data" ADD COLUMN "cached_object_path" TEXT;

ALTER TABLE "catalog_entries__open_data" ADD COLUMN "cached_source_version" TEXT;
