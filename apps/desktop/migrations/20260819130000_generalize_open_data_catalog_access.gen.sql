-- Generated from supabase/migrations/20260819130000_generalize_open_data_catalog_access.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 6
-- Statements dropped (RLS/funcs/triggers/data/etc.): 5
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 6
ALTER TABLE "catalog_entries__open_data" ADD COLUMN "access_kind" catalog_entries__open_data__access_kind NOT NULL;

ALTER TABLE "catalog_entries__open_data" ADD COLUMN "api_base_url" TEXT;

ALTER TABLE "catalog_entries__open_data" ADD COLUMN "api_resource_format" TEXT;

ALTER TABLE "catalog_entries__open_data" ADD COLUMN "api_resource_id" TEXT;

ALTER TABLE "catalog_entries__open_data" ADD COLUMN "api_service" catalog_entries__open_data__api_service;

CREATE UNIQUE INDEX catalog_entries__open_data__api_resource_unique ON catalog_entries__open_data(api_service, api_base_url, external_dataset_id, api_resource_id) WHERE (access_kind = CAST('api_resource' AS catalog_entries__open_data__access_kind));
