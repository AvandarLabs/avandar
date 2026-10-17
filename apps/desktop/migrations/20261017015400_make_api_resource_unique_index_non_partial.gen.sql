-- Generated from supabase/migrations/20261017015400_make_api_resource_unique_index_non_partial.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 0
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
DROP INDEX IF EXISTS "catalog_entries__open_data__api_resource_unique";

CREATE UNIQUE INDEX catalog_entries__open_data__api_resource_unique ON catalog_entries__open_data(api_service, api_base_url, external_dataset_id, api_resource_id);
