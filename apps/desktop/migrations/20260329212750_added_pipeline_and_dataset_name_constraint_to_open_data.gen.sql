-- Generated from supabase/migrations/20260329212750_added_pipeline_and_dataset_name_constraint_to_open_data.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 1
-- Statements dropped (RLS/funcs/triggers/data/etc.): 1
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
CREATE UNIQUE INDEX unique_dataset_pipeline ON catalog_entries__open_data(dataset_name, pipeline_name);
