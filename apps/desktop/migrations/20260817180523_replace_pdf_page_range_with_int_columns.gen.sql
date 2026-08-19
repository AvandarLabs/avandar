-- Generated from supabase/migrations/20260817180523_replace_pdf_page_range_with_int_columns.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 3
-- Statements dropped (RLS/funcs/triggers/data/etc.): 0
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
ALTER TABLE "datasets__pdf_file" DROP COLUMN "page_range";

ALTER TABLE "datasets__pdf_file" ADD COLUMN "page_range_end" INTEGER;

ALTER TABLE "datasets__pdf_file" ADD COLUMN "page_range_start" INTEGER;
