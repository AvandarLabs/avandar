-- Generated from supabase/migrations/20261113022522_dictionary_bindings.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 7
-- Statements dropped (RLS/funcs/triggers/data/etc.): 36
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 5
CREATE TABLE "dataset_columns__dictionary_bindings" ("id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "dataset_id" UUID NOT NULL, "dataset_column_id" UUID NOT NULL, "dictionary_id" UUID, "entry_id" UUID, "code_list_id" UUID, "mode" dataset_columns__binding_mode NOT NULL DEFAULT 'reference', "direction" dataset_columns__binding_direction NOT NULL DEFAULT 'decode', "applied_dictionary_version" INTEGER NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE UNIQUE INDEX dataset_columns__dictionary_bindings_dataset_column_id_key ON dataset_columns__dictionary_bindings(dataset_column_id);

CREATE UNIQUE INDEX dataset_columns__dictionary_bindings_pkey ON dataset_columns__dictionary_bindings(id);

CREATE INDEX idx_dataset_columns__dictionary_bindings__code_list_id ON dataset_columns__dictionary_bindings(code_list_id);

CREATE INDEX idx_dataset_columns__dictionary_bindings__dataset_id ON dataset_columns__dictionary_bindings(dataset_id);

CREATE INDEX idx_dataset_columns__dictionary_bindings__dictionary_id ON dataset_columns__dictionary_bindings(dictionary_id);

CREATE INDEX idx_dataset_columns__dictionary_bindings__entry_id ON dataset_columns__dictionary_bindings(entry_id);
