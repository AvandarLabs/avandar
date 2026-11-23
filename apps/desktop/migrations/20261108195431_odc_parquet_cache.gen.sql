-- Generated from supabase/migrations/20261108195431_odc_parquet_cache.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 10
-- Statements dropped (RLS/funcs/triggers/data/etc.): 15
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 3
ALTER TABLE "data_catalog_listings" ADD COLUMN "parquet_cache_build_id" UUID;

ALTER TABLE "data_catalog_listings" ADD COLUMN "parquet_cache_build_started_at" TIMESTAMPTZ;

ALTER TABLE "data_catalog_listings" ADD COLUMN "parquet_cache_built_at" TIMESTAMPTZ;

ALTER TABLE "data_catalog_listings" ADD COLUMN "parquet_cache_byte_size" INTEGER;

ALTER TABLE "data_catalog_listings" ADD COLUMN "parquet_cache_failure_code" TEXT;

ALTER TABLE "data_catalog_listings" ADD COLUMN "parquet_cache_folder_path" TEXT;

ALTER TABLE "data_catalog_listings" ADD COLUMN "parquet_cache_part_count" INTEGER;

ALTER TABLE "data_catalog_listings" ADD COLUMN "parquet_cache_row_count" INTEGER;

ALTER TABLE "data_catalog_listings" ADD COLUMN "parquet_cache_source_version" TEXT;

ALTER TABLE "data_catalog_listings" ADD COLUMN "parquet_cache_status" data_catalog_listings__parquet_cache_status;
