-- Generated from supabase/migrations/20261109032546_individuals_assignment.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 1
-- Statements dropped (RLS/funcs/triggers/data/etc.): 4
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
CREATE INDEX idx_individuals__workspace_id_assigned_to ON individuals(workspace_id, assigned_to);
