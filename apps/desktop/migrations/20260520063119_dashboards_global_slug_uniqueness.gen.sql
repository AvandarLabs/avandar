-- Generated from supabase/migrations/20260520063119_dashboards_global_slug_uniqueness.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 1
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
DROP INDEX IF EXISTS "dashboards__workspace_id_slug";

CREATE UNIQUE INDEX dashboards__slug_unique_when_public ON dashboards(slug) WHERE ((is_public = TRUE) AND (NOT slug IS NULL));
