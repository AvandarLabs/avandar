-- Generated from supabase/migrations/20260329222138_added_catalog_entries_dataset_columns.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 7
-- Statements dropped (RLS/funcs/triggers/data/etc.): 30
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 1
DROP INDEX IF EXISTS "unique_dataset_pipeline";

CREATE TABLE "catalog_entries__dataset_column" ("id" UUID NOT NULL, "catalog_entry_id" UUID NOT NULL, "column_name" TEXT NOT NULL, "display_order" INTEGER, "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, "original_data_type" TEXT NOT NULL, "cast_data_type" datasets__duckdb_data_type NOT NULL);

ALTER TABLE "catalog_entries__open_data" DROP COLUMN "dataset_name";

ALTER TABLE "catalog_entries__open_data" ADD COLUMN "display_name" TEXT NOT NULL;

ALTER TABLE "catalog_entries__open_data" ADD COLUMN "parquet_file_name" TEXT NOT NULL;

CREATE UNIQUE INDEX catalog_entries__dataset_column_pkey ON catalog_entries__dataset_column(id);

CREATE UNIQUE INDEX unique_parquet_file_pipeline ON catalog_entries__open_data(parquet_file_name, pipeline_name);
