-- Generated from supabase/migrations/20261109082310_gho_listing_companions_and_freshness_probes.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 4
-- Statements dropped (RLS/funcs/triggers/data/etc.): 16
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 4
ALTER TABLE "data_catalog_listings" ADD COLUMN "api_freshness_probe" JSONB;

ALTER TABLE "data_catalog_listings" ADD COLUMN "companion_listings" JSONB NOT NULL;

ALTER TABLE "data_catalog_listings" ADD COLUMN "parquet_cache_checked_at" TIMESTAMPTZ;

ALTER TABLE "data_catalog_listings" ADD COLUMN "parquet_cache_checked_source_version" TEXT;
