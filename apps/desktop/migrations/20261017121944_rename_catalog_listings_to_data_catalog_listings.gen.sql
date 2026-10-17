-- Generated from supabase/migrations/20261017121944_rename_catalog_listings_to_data_catalog_listings.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 4
-- Statements dropped (RLS/funcs/triggers/data/etc.): 11
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
ALTER TABLE "catalog_listings__open_data" RENAME TO "data_catalog_listings";

ALTER TABLE "catalog_listings__dataset_column" RENAME TO "data_catalog_listings__relation_columns";

DROP INDEX "catalog_listings__open_data__api_resource_unique";

CREATE UNIQUE INDEX "data_catalog_listings__api_resource_unique" ON "data_catalog_listings"("api_service", "api_base_url", "external_dataset_id", "api_resource_id");
