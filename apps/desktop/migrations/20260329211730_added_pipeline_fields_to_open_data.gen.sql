-- Generated from supabase/migrations/20260329211730_added_pipeline_fields_to_open_data.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 0
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
alter table "catalog_entries__open_data"
add column "pipeline_name" text not null;

alter table "catalog_entries__open_data"
add column "pipeline_run_id" text not null;
