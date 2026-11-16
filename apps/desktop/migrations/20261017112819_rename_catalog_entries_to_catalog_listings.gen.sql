-- Generated from supabase/migrations/20261017112819_rename_catalog_entries_to_catalog_listings.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 6
-- Statements dropped (RLS/funcs/triggers/data/etc.): 14
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
ALTER TABLE "catalog_entries__open_data" RENAME TO "catalog_listings__open_data";

ALTER TABLE "catalog_entries__dataset_column" RENAME TO "catalog_listings__dataset_column";

ALTER TABLE "catalog_listings__dataset_column" RENAME COLUMN "catalog_entry_id" TO "catalog_listing_id";

ALTER TABLE "datasets__open_data" RENAME COLUMN "catalog_entry_id" TO "catalog_listing_id";

DROP INDEX "catalog_entries__open_data__api_resource_unique";

CREATE UNIQUE INDEX "catalog_listings__open_data__api_resource_unique" ON "catalog_listings__open_data"("api_service", "api_base_url", "external_dataset_id", "api_resource_id");
