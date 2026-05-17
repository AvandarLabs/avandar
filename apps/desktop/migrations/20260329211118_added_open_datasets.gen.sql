-- Generated from supabase/migrations/20260329211118_added_open_datasets.sql by
-- apps/desktop/scripts/gen-sqlite-migrations.ts. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 5
-- Statements dropped (RLS/funcs/triggers/data/etc.): 75
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 4
CREATE TABLE "catalog_entries__open_data" ("id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "date_of_last_sync" TIMESTAMPTZ, "date_of_last_update" TIMESTAMPTZ, "coverage_start_date" TIMESTAMPTZ, "coverage_end_date" TIMESTAMPTZ, "external_organization_name" TEXT NOT NULL, "external_service_name" TEXT, "external_dataset_id" TEXT, "source_url" TEXT, "canonical_urls" TEXT, "license" TEXT, "update_frequency" TEXT, "description" TEXT, "notes" TEXT, "metadata" JSONB);

CREATE TABLE "datasets__open_data" ("id" UUID NOT NULL, "dataset_id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "catalog_entry_id" UUID NOT NULL);

CREATE UNIQUE INDEX catalog_entries__open_data_pkey ON catalog_entries__open_data(id);

CREATE UNIQUE INDEX datasets__open_data_dataset_id_key ON datasets__open_data(dataset_id);

CREATE UNIQUE INDEX datasets__open_data_pkey ON datasets__open_data(id);
