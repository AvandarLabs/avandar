-- Generated from supabase/migrations/20250929162612_Adding support for optimized datasets.sql by
-- apps/desktop/scripts/gen-sqlite-migrations.ts. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 9
-- Statements dropped (RLS/funcs/triggers/data/etc.): 105
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 4
DROP INDEX IF EXISTS "datasets__local_csv_dataset_id_key";

DROP INDEX IF EXISTS "datasets__local_csv_pkey";

DROP INDEX IF EXISTS "entity_field_values_pkey";

DROP TABLE "datasets__local_csv";

DROP TABLE "entity_field_values";

CREATE TABLE "datasets__csv_file" ("id" UUID NOT NULL, "dataset_id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "size_in_bytes" INTEGER NOT NULL, "rows_to_skip" INTEGER NOT NULL DEFAULT 0, "quote_char" TEXT NOT NULL, "escape_char" TEXT NOT NULL, "delimiter" TEXT NOT NULL, "newline_delimiter" TEXT NOT NULL, "comment_char" TEXT, "has_header" INTEGER NOT NULL DEFAULT TRUE, "date_format" TEXT, "timestamp_format" TEXT);

CREATE UNIQUE INDEX datasets__csv_file_dataset_id_key ON datasets__csv_file(dataset_id);

CREATE UNIQUE INDEX datasets__csv_file_pkey ON datasets__csv_file(id);

CREATE UNIQUE INDEX entities__entity_config_external_id_unique ON entities(entity_config_id, external_id);
