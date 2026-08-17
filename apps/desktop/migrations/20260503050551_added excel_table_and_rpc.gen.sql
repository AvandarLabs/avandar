-- Generated from supabase/migrations/20260503050551_added excel_table_and_rpc.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 3
-- Statements dropped (RLS/funcs/triggers/data/etc.): 33
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 2
CREATE TABLE "datasets__xls_file" ("id" UUID NOT NULL, "dataset_id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "is_in_cloud_storage" INTEGER NOT NULL DEFAULT FALSE, "size_in_bytes" INTEGER NOT NULL, "rows_to_skip" INTEGER NOT NULL DEFAULT 0, "sheet_name" TEXT, "has_header" INTEGER NOT NULL DEFAULT TRUE, "date_format" TEXT, "timestamp_format" TEXT);

CREATE UNIQUE INDEX datasets__xls_file_dataset_id_key ON datasets__xls_file(dataset_id);

CREATE UNIQUE INDEX datasets__xls_file_pkey ON datasets__xls_file(id);
