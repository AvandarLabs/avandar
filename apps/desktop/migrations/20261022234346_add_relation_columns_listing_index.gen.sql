-- Generated from supabase/migrations/20261022234346_add_relation_columns_listing_index.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 1
-- Statements dropped (RLS/funcs/triggers/data/etc.): 0
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
CREATE INDEX data_catalog_listings__relation_columns__listing ON data_catalog_listings__relation_columns(catalog_listing_id, display_order);
