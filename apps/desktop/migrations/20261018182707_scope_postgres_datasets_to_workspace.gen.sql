-- Generated from supabase/migrations/20261018182707_scope_postgres_datasets_to_workspace.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 1
-- Statements dropped (RLS/funcs/triggers/data/etc.): 7
-- FK constraints dropped (target not synced to SQLite): 1
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 1
CREATE UNIQUE INDEX datasets__id_workspace_id_key ON datasets(id, workspace_id);
