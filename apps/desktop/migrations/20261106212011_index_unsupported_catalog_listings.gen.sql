-- Generated from supabase/migrations/20261106212011_index_unsupported_catalog_listings.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 3
-- Statements dropped (RLS/funcs/triggers/data/etc.): 5
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 1
ALTER TABLE "data_catalog_listings" ADD COLUMN "is_workspace_loadable" INTEGER NOT NULL DEFAULT TRUE;

ALTER TABLE "data_catalog_listings" ADD COLUMN "source_asset_type" TEXT;

ALTER TABLE "data_catalog_listings" ADD COLUMN "source_download_url" TEXT;
