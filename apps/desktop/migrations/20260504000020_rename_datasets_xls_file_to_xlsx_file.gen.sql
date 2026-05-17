-- Generated from supabase/migrations/20260504000020_rename_datasets_xls_file_to_xlsx_file.sql by
-- apps/desktop/scripts/gen-sqlite-migrations.ts. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 1
-- Statements dropped (RLS/funcs/triggers/data/etc.): 4
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
ALTER TABLE datasets__xls_file RENAME TO datasets__xlsx_file;
