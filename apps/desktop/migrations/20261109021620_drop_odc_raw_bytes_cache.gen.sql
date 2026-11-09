-- Generated from supabase/migrations/20261109021620_drop_odc_raw_bytes_cache.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 3
-- Statements dropped (RLS/funcs/triggers/data/etc.): 3
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 1
ALTER TABLE "data_catalog_listings" DROP COLUMN "cached_at";

ALTER TABLE "data_catalog_listings" DROP COLUMN "cached_object_path";

ALTER TABLE "data_catalog_listings" DROP COLUMN "cached_source_version";
