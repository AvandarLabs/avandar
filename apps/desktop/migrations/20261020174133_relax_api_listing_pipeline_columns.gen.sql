-- Generated from supabase/migrations/20261020174133_relax_api_listing_pipeline_columns.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 1
-- Statements dropped (RLS/funcs/triggers/data/etc.): 2
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 1
CREATE INDEX data_catalog_listings__pipeline_drive_last_update ON data_catalog_listings(pipeline_name, api_base_url, date_of_last_update);
