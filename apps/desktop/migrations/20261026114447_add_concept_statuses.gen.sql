-- Generated from supabase/migrations/20261026114447_add_concept_statuses.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 6
-- Statements dropped (RLS/funcs/triggers/data/etc.): 21
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 5
CREATE TABLE "concept_statuses" ("id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "concept_id" UUID NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "color" TEXT NOT NULL, "position" INTEGER NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);

ALTER TABLE "concepts" ADD COLUMN "default_status_id" UUID;

CREATE UNIQUE INDEX concept_statuses__concept_id_lower_name_unique ON concept_statuses(concept_id, LOWER(name));

CREATE UNIQUE INDEX concept_statuses__id_concept_id_unique ON concept_statuses(id, concept_id);

CREATE UNIQUE INDEX concept_statuses_pkey ON concept_statuses(id);

CREATE INDEX idx_concept_statuses__concept_id_position ON concept_statuses(concept_id, "position");
