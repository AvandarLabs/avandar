-- Generated from supabase/migrations/20261111235337_data_dictionaries.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 19
-- Statements dropped (RLS/funcs/triggers/data/etc.): 83
-- FK constraints dropped (target not synced to SQLite): 1
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 10
CREATE TABLE "data_dictionaries" ("id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "owner_id" UUID NOT NULL, "owner_profile_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "name" TEXT NOT NULL, "description" TEXT, "version" INTEGER NOT NULL DEFAULT 1, "created_from_dataset_ids" TEXT NOT NULL);

CREATE TABLE "data_dictionaries__code_lists" ("id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "dictionary_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "name" TEXT NOT NULL, "is_ordered" INTEGER NOT NULL DEFAULT FALSE, "pairs" JSONB NOT NULL);

CREATE TABLE "data_dictionaries__entries" ("id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "dictionary_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "name" TEXT NOT NULL, "column_names" TEXT NOT NULL, "kind" data_dictionaries__entry_kind NOT NULL, "unit" TEXT, "valid_min" REAL, "valid_max" REAL, "description" TEXT, "position" INTEGER NOT NULL);

CREATE TABLE "data_dictionaries__entry_codings" ("id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "dictionary_id" UUID NOT NULL, "entry_id" UUID NOT NULL, "code_list_id" UUID NOT NULL, "is_primary" INTEGER NOT NULL DEFAULT FALSE, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE UNIQUE INDEX data_dictionaries__code_lists_id_dictionary_id_key ON data_dictionaries__code_lists(id, dictionary_id);

CREATE UNIQUE INDEX data_dictionaries__code_lists_pkey ON data_dictionaries__code_lists(id);

CREATE UNIQUE INDEX data_dictionaries__entries__name_unique ON data_dictionaries__entries(dictionary_id, LOWER(name));

CREATE UNIQUE INDEX data_dictionaries__entries_id_dictionary_id_key ON data_dictionaries__entries(id, dictionary_id);

CREATE UNIQUE INDEX data_dictionaries__entries_pkey ON data_dictionaries__entries(id);

CREATE UNIQUE INDEX data_dictionaries__entry_codings__one_primary ON data_dictionaries__entry_codings(entry_id) WHERE is_primary;

CREATE UNIQUE INDEX data_dictionaries__entry_codings_entry_id_code_list_id_key ON data_dictionaries__entry_codings(entry_id, code_list_id);

CREATE UNIQUE INDEX data_dictionaries__entry_codings_pkey ON data_dictionaries__entry_codings(id);

CREATE UNIQUE INDEX data_dictionaries_id_workspace_id_key ON data_dictionaries(id, workspace_id);

CREATE UNIQUE INDEX data_dictionaries_pkey ON data_dictionaries(id);

CREATE INDEX idx_data_dictionaries__code_lists__dictionary_id ON data_dictionaries__code_lists(dictionary_id);

CREATE INDEX idx_data_dictionaries__entry_codings__code_list_id ON data_dictionaries__entry_codings(code_list_id);

CREATE INDEX idx_data_dictionaries__entry_codings__dictionary_id ON data_dictionaries__entry_codings(dictionary_id);

CREATE INDEX idx_data_dictionaries__owner_profile_id ON data_dictionaries(owner_profile_id);

CREATE INDEX idx_data_dictionaries__workspace_owner ON data_dictionaries(workspace_id, owner_id);
