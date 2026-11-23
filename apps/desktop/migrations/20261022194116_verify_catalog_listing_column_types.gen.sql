-- Generated from supabase/migrations/20261022194116_verify_catalog_listing_column_types.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 1
-- Statements dropped (RLS/funcs/triggers/data/etc.): 5
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
ALTER TABLE "data_catalog_listings" ADD COLUMN "date_column_type_last_verified" TIMESTAMPTZ;
