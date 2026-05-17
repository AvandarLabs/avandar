-- Generated from supabase/migrations/20260316041245_added_query_result_dataset.sql by
-- apps/desktop/scripts/gen-sqlite-migrations.ts. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 3
-- Statements dropped (RLS/funcs/triggers/data/etc.): 52
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 3
CREATE TABLE "datasets__virtual" ("id" UUID NOT NULL, "dataset_id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "raw_sql" TEXT NOT NULL);

CREATE UNIQUE INDEX datasets__virtual_dataset_id_key ON datasets__virtual(dataset_id);

CREATE UNIQUE INDEX datasets__virtual_pkey ON datasets__virtual(id);
