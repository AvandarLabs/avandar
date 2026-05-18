-- Generated from supabase/migrations/20260329222138_added_catalog_entries_dataset_columns.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 7
-- Statements dropped (RLS/funcs/triggers/data/etc.): 30
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 1
drop index if exists "unique_dataset_pipeline";

create table "catalog_entries__dataset_column" (
  "id" uuid not null,
  "catalog_entry_id" uuid not null,
  "column_name" text not null,
  "display_order" integer,
  "created_at" timestamptz default current_timestamp,
  "updated_at" timestamptz default current_timestamp,
  "original_data_type" text not null,
  "cast_data_type" datasets__duckdb_data_type not null
);

alter table "catalog_entries__open_data"
drop column "dataset_name";

alter table "catalog_entries__open_data"
add column "display_name" text not null;

alter table "catalog_entries__open_data"
add column "parquet_file_name" text not null;

create unique index catalog_entries__dataset_column_pkey on catalog_entries__dataset_column (id);

create unique index unique_parquet_file_pipeline on catalog_entries__open_data (
  parquet_file_name,
  pipeline_name
);
