-- Generated from supabase/migrations/20250929162612_Adding support for optimized datasets.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 9
-- Statements dropped (RLS/funcs/triggers/data/etc.): 105
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 4
drop index if exists "datasets__local_csv_dataset_id_key";

drop index if exists "datasets__local_csv_pkey";

drop index if exists "entity_field_values_pkey";

drop table "datasets__local_csv";

drop table "entity_field_values";

create table "datasets__csv_file" (
  "id" uuid not null,
  "dataset_id" uuid not null,
  "workspace_id" uuid not null,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "size_in_bytes" integer not null,
  "rows_to_skip" integer not null default 0,
  "quote_char" text not null,
  "escape_char" text not null,
  "delimiter" text not null,
  "newline_delimiter" text not null,
  "comment_char" text,
  "has_header" integer not null default true,
  "date_format" text,
  "timestamp_format" text
);

create unique index datasets__csv_file_dataset_id_key on datasets__csv_file (
  dataset_id
);

create unique index datasets__csv_file_pkey on datasets__csv_file (id);

create unique index entities__entity_config_external_id_unique on entities (
  entity_config_id,
  external_id
);
