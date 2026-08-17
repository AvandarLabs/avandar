-- Generated from supabase/migrations/20260817174442_add_datasets_pdf_file_table.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 3
-- Statements dropped (RLS/funcs/triggers/data/etc.): 27
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 2
CREATE TABLE "datasets__pdf_file" ("id" UUID NOT NULL, "dataset_id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "is_in_cloud_storage" INTEGER NOT NULL DEFAULT FALSE, "size_in_bytes" INTEGER NOT NULL, "has_original_file" INTEGER NOT NULL DEFAULT FALSE, "regions" JSONB NOT NULL, "detection_mode" datasets__pdf_detection_mode NOT NULL, "grid_x" JSONB, "grid_y" JSONB, "page_range" INT4RANGE, "header_rows" INTEGER NOT NULL DEFAULT 1, "fill_merged_cells" INTEGER NOT NULL DEFAULT TRUE, "fingerprint" JSONB NOT NULL);

CREATE UNIQUE INDEX datasets__pdf_file_dataset_id_key ON datasets__pdf_file(dataset_id);

CREATE UNIQUE INDEX datasets__pdf_file_pkey ON datasets__pdf_file(id);
