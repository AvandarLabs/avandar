-- Generated from supabase/migrations/20261018201318_postgres_connector_workspace_keys_and_vault_cleanup.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 1
-- Statements dropped (RLS/funcs/triggers/data/etc.): 13
-- FK constraints dropped (target not synced to SQLite): 1
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 1
CREATE UNIQUE INDEX datasets__id_workspace_id_key ON datasets(id, workspace_id);
