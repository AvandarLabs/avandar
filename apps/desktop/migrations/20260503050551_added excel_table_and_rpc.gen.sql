-- Generated from supabase/migrations/20260503050551_added excel_table_and_rpc.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 3
-- Statements dropped (RLS/funcs/triggers/data/etc.): 33
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 2
create table "datasets__xls_file" (
  "id" uuid not null,
  "dataset_id" uuid not null,
  "workspace_id" uuid not null,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "is_in_cloud_storage" integer not null default false,
  "size_in_bytes" integer not null,
  "rows_to_skip" integer not null default 0,
  "sheet_name" text,
  "has_header" integer not null default true,
  "date_format" text,
  "timestamp_format" text
);

create unique index datasets__xls_file_dataset_id_key on datasets__xls_file (
  dataset_id
);

create unique index datasets__xls_file_pkey on datasets__xls_file (id);
