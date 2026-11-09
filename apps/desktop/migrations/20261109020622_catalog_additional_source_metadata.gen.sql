-- Generated from supabase/migrations/20261109020622_catalog_additional_source_metadata.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 4
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
ALTER TABLE "data_catalog_listings" DROP COLUMN "source_metadata";

ALTER TABLE "data_catalog_listings" ADD COLUMN "additional_source_metadata" JSONB;
