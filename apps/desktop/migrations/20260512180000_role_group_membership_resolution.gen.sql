-- Generated from supabase/migrations/20260512180000_role_group_membership_resolution.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 17
-- FK constraints dropped (target not synced to SQLite): 1
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
--
-- HAND-EDITED: The Postgres source also creates
--   `idx_workspace_memberships__role_group_id` on the `role_group_id`
-- column. That column references `role_groups`, which is in
-- EXCLUDED_TABLES, so the generator correctly dropped the
-- ALTER TABLE ... ADD COLUMN role_group_id, leaving no column to
-- index. The generator did not realise the dependent CREATE INDEX
-- was now dangling and emitted it anyway; SQLite then errors with
-- "no such column: role_group_id". Removed by hand here.
alter table workspace_memberships
add column updated_at timestamptz not null default current_timestamp;
