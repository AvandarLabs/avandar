-- Generated from supabase/migrations/20260329211118_added_open_datasets.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 5
-- Statements dropped (RLS/funcs/triggers/data/etc.): 75
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 4
create table "catalog_entries__open_data" (
  "id" uuid not null,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "date_of_last_sync" timestamptz,
  "date_of_last_update" timestamptz,
  "coverage_start_date" timestamptz,
  "coverage_end_date" timestamptz,
  "external_organization_name" text not null,
  "external_service_name" text,
  "external_dataset_id" text,
  "source_url" text,
  "canonical_urls" text,
  "license" text,
  "update_frequency" text,
  "description" text,
  "notes" text,
  "metadata" jsonb
);

create table "datasets__open_data" (
  "id" uuid not null,
  "dataset_id" uuid not null,
  "workspace_id" uuid not null,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "catalog_entry_id" uuid not null
);

create unique index catalog_entries__open_data_pkey on catalog_entries__open_data (id);

create unique index datasets__open_data_dataset_id_key on datasets__open_data (
  dataset_id
);

create unique index datasets__open_data_pkey on datasets__open_data (id);
