-- Generated from supabase/migrations/20250706214712_init_db.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 26
-- Statements dropped (RLS/funcs/triggers/data/etc.): 300
-- FK constraints dropped (target not synced to SQLite): 4
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 15
create table "entity_configs" (
  "id" uuid not null,
  "owner_id" uuid not null,
  "workspace_id" uuid not null,
  "name" text not null,
  "description" text,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "allow_manual_creation" integer not null
);

create table "entity_field_configs" (
  "id" uuid not null,
  "workspace_id" uuid not null,
  "entity_config_id" uuid not null,
  "name" text not null,
  "description" text,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "class" entity_field_configs__class not null,
  "base_data_type" entity_field_configs__base_data_type not null,
  "value_extractor_type" entity_field_configs__value_extractor_type not null,
  "is_title_field" integer not null default false,
  "is_id_field" integer not null default false,
  "is_array" integer,
  "allow_manual_edit" integer not null default false
);

create table "user_profiles" (
  "id" uuid not null,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "user_id" uuid not null,
  "workspace_id" uuid not null,
  "membership_id" uuid not null,
  "full_name" text not null,
  "display_name" text not null
);

create table "value_extractors__aggregation" (
  "id" uuid not null,
  "workspace_id" uuid not null,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "entity_field_config_id" uuid not null,
  "aggregation_type" value_extractors__aggregation_type not null,
  "dataset_id" uuid not null,
  "dataset_field_id" uuid not null,
  "filter" jsonb
);

create table "value_extractors__dataset_column_value" (
  "id" uuid not null,
  "workspace_id" uuid not null,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "entity_field_config_id" uuid not null,
  "value_picker_rule_type" value_extractors__value_picker_rule_type not null,
  "dataset_id" uuid not null,
  "dataset_field_id" uuid not null
);

create table "value_extractors__manual_entry" (
  "id" uuid not null,
  "workspace_id" uuid not null,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "entity_field_config_id" uuid not null
);

create table "workspace_memberships" (
  "id" uuid not null,
  "created_at" timestamptz not null default current_timestamp,
  "workspace_id" uuid not null,
  "user_id" uuid not null
);

create table "workspaces" (
  "id" uuid not null,
  "owner_id" uuid not null,
  "name" text not null,
  "slug" text not null,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp
);

create unique index entity_configs_pkey on entity_configs (id);

create unique index entity_field_configs_pkey on entity_field_configs (id);

create index idx_entity_configs__workspace_id on entity_configs (
  workspace_id
);

create index idx_entity_field_configs__entity_config_id_workspace_id on entity_field_configs (
  entity_config_id,
  workspace_id
);

create index idx_user_profiles__user_id_workspace_id on user_profiles (
  user_id,
  workspace_id
);

create index idx_value_extractors__aggregation__entity_field_config_id_works on value_extractors__aggregation (
  entity_field_config_id,
  workspace_id
);

create index idx_value_extractors__dataset_column_value__entity_field_config on value_extractors__dataset_column_value (
  entity_field_config_id,
  workspace_id
);

create index idx_value_extractors__manual_entry__entity_field_config_id_work on value_extractors__manual_entry (
  entity_field_config_id,
  workspace_id
);

create index idx_workspace_memberships__user_id_workspace_id on workspace_memberships (
  user_id,
  workspace_id
);

create index idx_workspace_memberships__workspace_id on workspace_memberships (
  workspace_id
);

create unique index user_profiles_pkey on user_profiles (id);

create unique index value_extractors__aggregation_pkey on value_extractors__aggregation (id);

create unique index value_extractors__dataset_column_value_pkey on value_extractors__dataset_column_value (id);

create unique index value_extractors__manual_entry_pkey on value_extractors__manual_entry (id);

create unique index workspace_memberships_pkey on workspace_memberships (id);

create unique index workspace_memberships_workspace_user_unique on workspace_memberships (
  workspace_id,
  user_id
);

create unique index workspaces_pkey on workspaces (id);

create unique index workspaces_slug_key on workspaces (slug);
