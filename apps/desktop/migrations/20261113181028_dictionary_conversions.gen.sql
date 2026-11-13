-- Generated from supabase/migrations/20261113181028_dictionary_conversions.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 9
-- Statements dropped (RLS/funcs/triggers/data/etc.): 89
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 6
ALTER TABLE "dataset_columns" ADD COLUMN "dictionary_binding_id" UUID;

ALTER TABLE "dataset_columns__dictionary_bindings" ADD COLUMN "keeps_original" INTEGER NOT NULL DEFAULT FALSE;

ALTER TABLE "dataset_columns__dictionary_bindings" ADD COLUMN "pinned_is_ordered" INTEGER;

ALTER TABLE "dataset_columns__dictionary_bindings" ADD COLUMN "pinned_pairs" JSONB;

ALTER TABLE "dataset_columns__dictionary_bindings" ADD COLUMN "replaced_data_type" datasets__ava_data_type;

ALTER TABLE "dataset_columns__dictionary_bindings" ADD COLUMN "value_overrides" JSONB NOT NULL;

ALTER TABLE "datasets__virtual" ADD COLUMN "linked_source_dataset_id" UUID;

CREATE INDEX idx_dataset_columns__dictionary_binding_id ON dataset_columns(dictionary_binding_id) WHERE (NOT dictionary_binding_id IS NULL);

CREATE INDEX idx_datasets__virtual__linked_source_dataset_id ON datasets__virtual(linked_source_dataset_id) WHERE (NOT linked_source_dataset_id IS NULL);
