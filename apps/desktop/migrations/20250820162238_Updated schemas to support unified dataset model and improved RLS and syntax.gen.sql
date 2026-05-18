-- Generated from supabase/migrations/20250820162238_Updated schemas to support unified dataset model and improved RLS and syntax.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 24
-- Statements dropped (RLS/funcs/triggers/data/etc.): 332
-- FK constraints dropped (target not synced to SQLite): 3
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 15
DROP INDEX IF EXISTS "idx_value_extractors__dataset_column_value__entity_field_config";

DROP INDEX IF EXISTS "idx_value_extractors__manual_entry__entity_field_config_id_work";

DROP INDEX IF EXISTS "tokens__google__user_google_account_unique";

CREATE TABLE "dataset_columns" ("id" UUID NOT NULL, "dataset_id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "name" TEXT NOT NULL, "data_type" datasets__column_data_type NOT NULL, "description" TEXT, "column_idx" INTEGER NOT NULL);

CREATE TABLE "datasets" ("id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "owner_id" UUID NOT NULL, "owner_profile_id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "date_of_last_sync" TIMESTAMPTZ, "name" TEXT NOT NULL, "source_type" datasets__source_type NOT NULL, "description" TEXT);

CREATE TABLE "datasets__google_sheets" ("id" UUID NOT NULL, "dataset_id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "google_account_id" TEXT NOT NULL, "google_document_id" TEXT NOT NULL, "rows_to_skip" INTEGER NOT NULL DEFAULT 0);

CREATE TABLE "datasets__local_csv" ("id" UUID NOT NULL, "dataset_id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "delimiter" TEXT NOT NULL, "size_in_bytes" INTEGER NOT NULL);

CREATE TABLE "entities" ("id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "workspace_id" UUID NOT NULL, "name" TEXT NOT NULL, "entity_config_id" UUID NOT NULL, "external_id" TEXT NOT NULL, "assigned_to" UUID, "status" TEXT NOT NULL);

CREATE TABLE "entity_field_values" ("id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "workspace_id" UUID NOT NULL, "entity_id" UUID NOT NULL, "entity_config_id" UUID NOT NULL, "entity_field_config_id" UUID NOT NULL, "value" TEXT, "value_set" TEXT NOT NULL, "dataset_id" UUID);

CREATE UNIQUE INDEX dataset_columns_pkey ON dataset_columns(id);

CREATE UNIQUE INDEX datasets__google_sheets_dataset_id_key ON datasets__google_sheets(dataset_id);

CREATE UNIQUE INDEX datasets__google_sheets_pkey ON datasets__google_sheets(id);

CREATE UNIQUE INDEX datasets__local_csv_dataset_id_key ON datasets__local_csv(dataset_id);

CREATE UNIQUE INDEX datasets__local_csv_pkey ON datasets__local_csv(id);

CREATE UNIQUE INDEX datasets_pkey ON datasets(id);

CREATE UNIQUE INDEX entities_pkey ON entities(id);

CREATE UNIQUE INDEX entity_field_values_pkey ON entity_field_values(id);

CREATE INDEX idx_dataset_column_value_extractors__efc_id_workspace_id ON value_extractors__dataset_column_value(entity_field_config_id, workspace_id);

CREATE INDEX idx_manual_entry_value_extractors__efc_id_workspace_id ON value_extractors__manual_entry(entity_field_config_id, workspace_id);

CREATE INDEX idx_workspaces__owner_id ON workspaces(owner_id);

CREATE UNIQUE INDEX user_profiles_membership_id_key ON user_profiles(membership_id);

CREATE UNIQUE INDEX value_extractors__aggregation_entity_field_config_id_key ON value_extractors__aggregation(entity_field_config_id);

CREATE UNIQUE INDEX value_extractors__dataset_column_val_entity_field_config_id_key ON value_extractors__dataset_column_value(entity_field_config_id);

CREATE UNIQUE INDEX value_extractors__manual_entry_entity_field_config_id_key ON value_extractors__manual_entry(entity_field_config_id);
