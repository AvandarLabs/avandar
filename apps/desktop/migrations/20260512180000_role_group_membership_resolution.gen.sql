-- Generated from supabase/migrations/20260512180000_role_group_membership_resolution.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 17
-- FK constraints dropped (target not synced to SQLite): 1
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
alter table workspace_memberships
add column updated_at timestamptz not null default current_timestamp;

create index if not exists idx_workspace_memberships__role_group_id on workspace_memberships (
  role_group_id
);
