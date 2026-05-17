-- Generated from supabase/migrations/20250721123411_Added google tokens table.sql by
-- apps/desktop/scripts/gen-sqlite-migrations.ts. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 32
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
DROP INDEX IF EXISTS "workspace_memberships_workspace_user_unique";

CREATE UNIQUE INDEX workspace_memberships__workspace_user_unique ON workspace_memberships(workspace_id, user_id);
