-- Generated from supabase/migrations/20260316041245_added_query_result_dataset.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 3
-- Statements dropped (RLS/funcs/triggers/data/etc.): 52
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 3
create table "datasets__virtual" (
  "id" uuid not null,
  "dataset_id" uuid not null,
  "workspace_id" uuid not null,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "raw_sql" text not null
);

create unique index datasets__virtual_dataset_id_key on datasets__virtual (
  dataset_id
);

create unique index datasets__virtual_pkey on datasets__virtual (id);
