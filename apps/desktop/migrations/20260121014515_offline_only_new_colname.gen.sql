-- Generated from supabase/migrations/20260121014515_offline_only_new_colname.sql by
-- apps/desktop/scripts/gen-sqlite-migrations.ts. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 7
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
ALTER TABLE "datasets__csv_file" DROP COLUMN "offline_only";

ALTER TABLE "datasets__csv_file" ADD COLUMN "is_in_cloud_storage" INTEGER DEFAULT FALSE;
