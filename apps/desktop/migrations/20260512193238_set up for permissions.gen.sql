-- Generated from supabase/migrations/20260512193238_set up for permissions.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 4
-- Statements dropped (RLS/funcs/triggers/data/etc.): 19
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 2
drop index if exists "datasets__xls_file_dataset_id_key";

drop index if exists "datasets__xls_file_pkey";

create unique index datasets__xlsx_file_dataset_id_key on datasets__xlsx_file (
  dataset_id
);

create unique index datasets__xlsx_file_pkey on datasets__xlsx_file (id);
