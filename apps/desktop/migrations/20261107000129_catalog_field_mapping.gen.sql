-- Generated from supabase/migrations/20261107000129_catalog_field_mapping.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 15
-- Statements dropped (RLS/funcs/triggers/data/etc.): 28
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 1
-- Hand-edited: the generated drops of `search_vector` and its index are
-- removed. SQLite never had that column (the generator skips a generated
-- column), and SQLite has no `DROP COLUMN IF EXISTS`.
ALTER TABLE "data_catalog_listings" RENAME COLUMN "external_organization_name" TO "organization1_name";

CREATE TABLE "data_catalog_drives" ("id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "pipeline_name" TEXT NOT NULL, "drive_key" TEXT NOT NULL, "organization1_label" TEXT, "organization2_label" TEXT, "organization3_label" TEXT, "organization4_label" TEXT);

ALTER TABLE "data_catalog_listings" ADD COLUMN "domains" TEXT;

ALTER TABLE "data_catalog_listings" ADD COLUMN "drive_id" UUID;

ALTER TABLE "data_catalog_listings" ADD COLUMN "organization2_name" TEXT;

ALTER TABLE "data_catalog_listings" ADD COLUMN "organization3_name" TEXT;

ALTER TABLE "data_catalog_listings" ADD COLUMN "organization4_name" TEXT;

ALTER TABLE "data_catalog_listings" ADD COLUMN "source_metadata" JSONB;

ALTER TABLE "data_catalog_listings" ADD COLUMN "tags" TEXT;

CREATE UNIQUE INDEX data_catalog_drives__pipeline_drive_unique ON data_catalog_drives(pipeline_name, drive_key);

CREATE UNIQUE INDEX data_catalog_drives_pkey ON data_catalog_drives(id);

CREATE INDEX data_catalog_listings__drive_id ON data_catalog_listings(drive_id);

CREATE INDEX data_catalog_listings__organization_levels ON data_catalog_listings(organization1_name, organization2_name);
