-- Generated from supabase/migrations/20250820162238_Updated schemas to support unified dataset model and improved RLS and syntax.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 24
-- Statements dropped (RLS/funcs/triggers/data/etc.): 332
-- FK constraints dropped (target not synced to SQLite): 3
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 15
drop index if exists "idx_value_extractors__dataset_column_value__entity_field_config";

drop index if exists "idx_value_extractors__manual_entry__entity_field_config_id_work";

drop index if exists "tokens__google__user_google_account_unique";

create table "dataset_columns" (
  "id" uuid not null,
  "dataset_id" uuid not null,
  "workspace_id" uuid not null,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "name" text not null,
  "data_type" datasets__column_data_type not null,
  "description" text,
  "column_idx" integer not null
);

create table "datasets" (
  "id" uuid not null,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "owner_id" uuid not null,
  "owner_profile_id" uuid not null,
  "workspace_id" uuid not null,
  "date_of_last_sync" timestamptz,
  "name" text not null,
  "source_type" datasets__source_type not null,
  "description" text
);

create table "datasets__google_sheets" (
  "id" uuid not null,
  "dataset_id" uuid not null,
  "workspace_id" uuid not null,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "google_account_id" text not null,
  "google_document_id" text not null,
  "rows_to_skip" integer not null default 0
);

create table "datasets__local_csv" (
  "id" uuid not null,
  "dataset_id" uuid not null,
  "workspace_id" uuid not null,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "delimiter" text not null,
  "size_in_bytes" integer not null
);

create table "entities" (
  "id" uuid not null,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "workspace_id" uuid not null,
  "name" text not null,
  "entity_config_id" uuid not null,
  "external_id" text not null,
  "assigned_to" uuid,
  "status" text not null
);

create table "entity_field_values" (
  "id" uuid not null,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "workspace_id" uuid not null,
  "entity_id" uuid not null,
  "entity_config_id" uuid not null,
  "entity_field_config_id" uuid not null,
  "value" text,
  "value_set" text not null,
  "dataset_id" uuid
);

create unique index dataset_columns_pkey on dataset_columns (id);

create unique index datasets__google_sheets_dataset_id_key on datasets__google_sheets (
  dataset_id
);

create unique index datasets__google_sheets_pkey on datasets__google_sheets (id);

create unique index datasets__local_csv_dataset_id_key on datasets__local_csv (
  dataset_id
);

create unique index datasets__local_csv_pkey on datasets__local_csv (id);

create unique index datasets_pkey on datasets (id);

create unique index entities_pkey on entities (id);

create unique index entity_field_values_pkey on entity_field_values (id);

create index idx_dataset_column_value_extractors__efc_id_workspace_id on value_extractors__dataset_column_value (
  entity_field_config_id,
  workspace_id
);

create index idx_manual_entry_value_extractors__efc_id_workspace_id on value_extractors__manual_entry (
  entity_field_config_id,
  workspace_id
);

create index idx_workspaces__owner_id on workspaces (
  owner_id
);

create unique index user_profiles_membership_id_key on user_profiles (
  membership_id
);

create unique index value_extractors__aggregation_entity_field_config_id_key on value_extractors__aggregation (
  entity_field_config_id
);

create unique index value_extractors__dataset_column_val_entity_field_config_id_key on value_extractors__dataset_column_value (
  entity_field_config_id
);

create unique index value_extractors__manual_entry_entity_field_config_id_key on value_extractors__manual_entry (
  entity_field_config_id
);
