-- Generated from supabase/migrations/20250706214712_init_db.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 26
-- Statements dropped (RLS/funcs/triggers/data/etc.): 300
-- FK constraints dropped (target not synced to SQLite): 4
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 15
CREATE TABLE "entity_configs" ("id" UUID NOT NULL, "owner_id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "allow_manual_creation" INTEGER NOT NULL);

CREATE TABLE "entity_field_configs" ("id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "entity_config_id" UUID NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "class" entity_field_configs__class NOT NULL, "base_data_type" entity_field_configs__base_data_type NOT NULL, "value_extractor_type" entity_field_configs__value_extractor_type NOT NULL, "is_title_field" INTEGER NOT NULL DEFAULT FALSE, "is_id_field" INTEGER NOT NULL DEFAULT FALSE, "is_array" INTEGER, "allow_manual_edit" INTEGER NOT NULL DEFAULT FALSE);

CREATE TABLE "user_profiles" ("id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "user_id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "membership_id" UUID NOT NULL, "full_name" TEXT NOT NULL, "display_name" TEXT NOT NULL);

CREATE TABLE "value_extractors__aggregation" ("id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "entity_field_config_id" UUID NOT NULL, "aggregation_type" value_extractors__aggregation_type NOT NULL, "dataset_id" UUID NOT NULL, "dataset_field_id" UUID NOT NULL, "filter" JSONB);

CREATE TABLE "value_extractors__dataset_column_value" ("id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "entity_field_config_id" UUID NOT NULL, "value_picker_rule_type" value_extractors__value_picker_rule_type NOT NULL, "dataset_id" UUID NOT NULL, "dataset_field_id" UUID NOT NULL);

CREATE TABLE "value_extractors__manual_entry" ("id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "entity_field_config_id" UUID NOT NULL);

CREATE TABLE "workspace_memberships" ("id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "workspace_id" UUID NOT NULL, "user_id" UUID NOT NULL);

CREATE TABLE "workspaces" ("id" UUID NOT NULL, "owner_id" UUID NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE UNIQUE INDEX entity_configs_pkey ON entity_configs(id);

CREATE UNIQUE INDEX entity_field_configs_pkey ON entity_field_configs(id);

CREATE INDEX idx_entity_configs__workspace_id ON entity_configs(workspace_id);

CREATE INDEX idx_entity_field_configs__entity_config_id_workspace_id ON entity_field_configs(entity_config_id, workspace_id);

CREATE INDEX idx_user_profiles__user_id_workspace_id ON user_profiles(user_id, workspace_id);

CREATE INDEX idx_value_extractors__aggregation__entity_field_config_id_works ON value_extractors__aggregation(entity_field_config_id, workspace_id);

CREATE INDEX idx_value_extractors__dataset_column_value__entity_field_config ON value_extractors__dataset_column_value(entity_field_config_id, workspace_id);

CREATE INDEX idx_value_extractors__manual_entry__entity_field_config_id_work ON value_extractors__manual_entry(entity_field_config_id, workspace_id);

CREATE INDEX idx_workspace_memberships__user_id_workspace_id ON workspace_memberships(user_id, workspace_id);

CREATE INDEX idx_workspace_memberships__workspace_id ON workspace_memberships(workspace_id);

CREATE UNIQUE INDEX user_profiles_pkey ON user_profiles(id);

CREATE UNIQUE INDEX value_extractors__aggregation_pkey ON value_extractors__aggregation(id);

CREATE UNIQUE INDEX value_extractors__dataset_column_value_pkey ON value_extractors__dataset_column_value(id);

CREATE UNIQUE INDEX value_extractors__manual_entry_pkey ON value_extractors__manual_entry(id);

CREATE UNIQUE INDEX workspace_memberships_pkey ON workspace_memberships(id);

CREATE UNIQUE INDEX workspace_memberships_workspace_user_unique ON workspace_memberships(workspace_id, user_id);

CREATE UNIQUE INDEX workspaces_pkey ON workspaces(id);

CREATE UNIQUE INDEX workspaces_slug_key ON workspaces(slug);
