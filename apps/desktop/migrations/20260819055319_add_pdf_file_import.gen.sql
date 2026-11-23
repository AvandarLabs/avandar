-- Generated from supabase/migrations/20260819055319_add_pdf_file_import.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 3
-- Statements dropped (RLS/funcs/triggers/data/etc.): 26
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 2
CREATE TABLE "datasets__pdf_file" ("id" UUID NOT NULL, "dataset_id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "is_in_cloud_storage" INTEGER NOT NULL DEFAULT FALSE, "size_in_bytes" INTEGER NOT NULL, "has_original_file" INTEGER NOT NULL DEFAULT FALSE, "regions" JSONB NOT NULL, "output_mode" datasets__pdf_output_mode NOT NULL, "llm_model" TEXT, "page_range_start" INTEGER, "page_range_end" INTEGER, "fingerprint" JSONB NOT NULL);

CREATE UNIQUE INDEX datasets__pdf_file_dataset_id_key ON datasets__pdf_file(dataset_id);

CREATE UNIQUE INDEX datasets__pdf_file_pkey ON datasets__pdf_file(id);
