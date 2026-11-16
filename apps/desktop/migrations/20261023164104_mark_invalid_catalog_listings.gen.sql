-- Generated from supabase/migrations/20261023164104_mark_invalid_catalog_listings.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 8
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 1
ALTER TABLE "data_catalog_listings" ADD COLUMN "invalid_dataset_reason" data_catalog_listings__invalid_dataset_reason;

ALTER TABLE "data_catalog_listings" ADD COLUMN "is_invalid" INTEGER NOT NULL DEFAULT FALSE;
