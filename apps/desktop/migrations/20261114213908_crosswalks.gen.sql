-- Generated from supabase/migrations/20261114213908_crosswalks.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 26
-- Statements dropped (RLS/funcs/triggers/data/etc.): 152
-- FK constraints dropped (target not synced to SQLite): 1
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 20
CREATE TABLE "crosswalks" ("id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "owner_id" UUID NOT NULL, "owner_profile_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "name" TEXT NOT NULL, "description" TEXT, "output_dataset_id" UUID, "codes_output_as" crosswalks__codes_output NOT NULL DEFAULT 'labels', "adds_source_column" INTEGER NOT NULL DEFAULT TRUE, "compiled_at" TIMESTAMPTZ, "compiled_code_lists" JSONB);

CREATE TABLE "crosswalks__columns" ("id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "crosswalk_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "name" TEXT NOT NULL, "position" INTEGER NOT NULL, "data_type" datasets__ava_data_type NOT NULL, "entry_id" UUID);

CREATE TABLE "crosswalks__datasets" ("id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "crosswalk_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "dataset_id" UUID NOT NULL, "layout_id" UUID NOT NULL);

CREATE TABLE "crosswalks__layouts" ("id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "crosswalk_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "signature" TEXT NOT NULL, "column_names" TEXT NOT NULL, "is_reference" INTEGER NOT NULL DEFAULT FALSE, "status" crosswalks__layout_status NOT NULL DEFAULT 'to_do');

CREATE TABLE "crosswalks__mappings" ("id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "crosswalk_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "layout_id" UUID NOT NULL, "column_id" UUID NOT NULL, "fill" JSONB NOT NULL, "status" crosswalks__mapping_status NOT NULL DEFAULT 'suggested', "confidence" REAL, "reason" crosswalks__mapping_reason);

CREATE UNIQUE INDEX crosswalks__columns__name_unique ON crosswalks__columns(crosswalk_id, LOWER(name));

CREATE UNIQUE INDEX crosswalks__columns_id_crosswalk_id_key ON crosswalks__columns(id, crosswalk_id);

CREATE UNIQUE INDEX crosswalks__columns_pkey ON crosswalks__columns(id);

CREATE UNIQUE INDEX crosswalks__datasets_crosswalk_id_dataset_id_key ON crosswalks__datasets(crosswalk_id, dataset_id);

CREATE UNIQUE INDEX crosswalks__datasets_pkey ON crosswalks__datasets(id);

CREATE UNIQUE INDEX crosswalks__layouts__one_reference ON crosswalks__layouts(crosswalk_id) WHERE is_reference;

CREATE UNIQUE INDEX crosswalks__layouts_crosswalk_id_signature_key ON crosswalks__layouts(crosswalk_id, signature);

CREATE UNIQUE INDEX crosswalks__layouts_id_crosswalk_id_key ON crosswalks__layouts(id, crosswalk_id);

CREATE UNIQUE INDEX crosswalks__layouts_pkey ON crosswalks__layouts(id);

CREATE UNIQUE INDEX crosswalks__mappings_layout_id_column_id_key ON crosswalks__mappings(layout_id, column_id);

CREATE UNIQUE INDEX crosswalks__mappings_pkey ON crosswalks__mappings(id);

CREATE UNIQUE INDEX crosswalks_id_workspace_id_key ON crosswalks(id, workspace_id);

CREATE UNIQUE INDEX crosswalks_pkey ON crosswalks(id);

CREATE INDEX idx_crosswalks__columns__entry_id ON crosswalks__columns(entry_id);

CREATE INDEX idx_crosswalks__datasets__dataset_id ON crosswalks__datasets(dataset_id);

CREATE INDEX idx_crosswalks__datasets__layout_id ON crosswalks__datasets(layout_id);

CREATE INDEX idx_crosswalks__mappings__column_id ON crosswalks__mappings(column_id);

CREATE INDEX idx_crosswalks__mappings__crosswalk_id ON crosswalks__mappings(crosswalk_id);

CREATE INDEX idx_crosswalks__output_dataset_id ON crosswalks(output_dataset_id) WHERE (NOT output_dataset_id IS NULL);

CREATE INDEX idx_crosswalks__owner_profile_id ON crosswalks(owner_profile_id);

CREATE INDEX idx_crosswalks__workspace_owner ON crosswalks(workspace_id, owner_id);
