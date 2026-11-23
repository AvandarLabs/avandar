-- Generated from supabase/migrations/20261109030100_add_bucketed_list_fields.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 7
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 2
ALTER TABLE "attribute_mappings__dataset_column" ADD COLUMN "bucket_column_id" UUID;

ALTER TABLE "concept_attributes" ADD COLUMN "bucket_grain" concept_attributes__bucket_grain;
