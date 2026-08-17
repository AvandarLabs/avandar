-- Generated from supabase/migrations/20260115155846_added_dashboard.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 4
-- Statements dropped (RLS/funcs/triggers/data/etc.): 32
-- FK constraints dropped (target not synced to SQLite): 1
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 2
CREATE TABLE "dashboards" ("id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "owner_id" UUID NOT NULL, "owner_profile_id" UUID NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "name" TEXT NOT NULL, "description" TEXT, "is_public" INTEGER NOT NULL DEFAULT FALSE, "slug" TEXT, "config" JSONB NOT NULL);

CREATE UNIQUE INDEX dashboards__workspace_id_slug ON dashboards(workspace_id, slug);

CREATE UNIQUE INDEX dashboards_pkey ON dashboards(id);

CREATE INDEX idx_dashboards__slug ON dashboards(slug);
