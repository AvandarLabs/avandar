-- Generated from supabase/migrations/20261109065256_catalog_scalable_search.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 4
-- Statements dropped (RLS/funcs/triggers/data/etc.): 40
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
CREATE INDEX data_catalog_listings__display_name ON data_catalog_listings(display_name, id);

CREATE INDEX data_catalog_listings__file_format ON data_catalog_listings((CASE WHEN (NOT api_resource_format IS NULL) THEN UPPER(api_resource_format) WHEN (NOT parquet_file_name IS NULL) THEN CAST('PARQUET' AS TEXT) ELSE CAST(NULL AS TEXT) END));

CREATE INDEX data_catalog_listings__last_updated_at ON data_catalog_listings(COALESCE(date_of_last_update, date_of_last_sync) DESC, display_name, id);

CREATE INDEX data_catalog_listings__organization2_name ON data_catalog_listings(organization2_name);
