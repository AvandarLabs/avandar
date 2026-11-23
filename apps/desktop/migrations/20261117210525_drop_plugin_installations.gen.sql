-- Generated from supabase/migrations/20261117210525_drop_plugin_installations.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 21
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
DROP INDEX IF EXISTS "plugin_installations__workspace_plugin_unique";

DROP INDEX IF EXISTS "plugin_installations_pkey";
