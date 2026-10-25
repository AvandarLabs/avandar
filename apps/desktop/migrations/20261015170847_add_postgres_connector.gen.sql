-- Generated from supabase/migrations/20261015170847_add_postgres_connector.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 3
-- Statements dropped (RLS/funcs/triggers/data/etc.): 79
-- FK constraints dropped (target not synced to SQLite): 1
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 3
CREATE TABLE "datasets__postgres_table" ("id" UUID NOT NULL, "dataset_id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "connection_id" UUID NOT NULL, "schema_name" TEXT NOT NULL, "table_name" TEXT NOT NULL, "relation_kind" datasets__postgres_table_relation_kind NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE UNIQUE INDEX datasets__postgres_table_dataset_id_key ON datasets__postgres_table(dataset_id);

CREATE UNIQUE INDEX datasets__postgres_table_pkey ON datasets__postgres_table(id);
