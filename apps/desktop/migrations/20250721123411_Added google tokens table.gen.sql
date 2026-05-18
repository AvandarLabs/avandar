-- Generated from supabase/migrations/20250721123411_Added google tokens table.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 32
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
drop index if exists "workspace_memberships_workspace_user_unique";

create unique index workspace_memberships__workspace_user_unique on workspace_memberships (
  workspace_id,
  user_id
);
