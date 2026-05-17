-- Generated from supabase/migrations/20260512193238_set up for permissions.sql by
-- apps/desktop/scripts/gen-sqlite-migrations.ts. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 4
-- Statements dropped (RLS/funcs/triggers/data/etc.): 19
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 2
DROP INDEX IF EXISTS "datasets__xls_file_dataset_id_key";

DROP INDEX IF EXISTS "datasets__xls_file_pkey";

CREATE UNIQUE INDEX datasets__xlsx_file_dataset_id_key ON datasets__xlsx_file(dataset_id);

CREATE UNIQUE INDEX datasets__xlsx_file_pkey ON datasets__xlsx_file(id);
