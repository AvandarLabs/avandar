-- Generated from supabase/migrations/20261026114856_add_individuals_status_id.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 8
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 1
ALTER TABLE "individuals" ADD COLUMN "status_id" UUID;

CREATE INDEX idx_individuals__concept_id_status_id ON individuals(concept_id, status_id);
