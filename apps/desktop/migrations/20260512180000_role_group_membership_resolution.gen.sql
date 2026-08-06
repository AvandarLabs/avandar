-- Generated from supabase/migrations/20260512180000_role_group_membership_resolution.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 3
-- Statements dropped (RLS/funcs/triggers/data/etc.): 17
-- FK constraints dropped (target not synced to SQLite): 1
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
--
-- HAND-EDITED: The Postgres source adds a `role_group_id uuid` column
-- to `workspace_memberships` with an FK to `role_groups`. `role_groups`
-- is in `EXCLUDED_TABLES`, so the FK constraint cannot be preserved on
-- SQLite — but per the generator's design (see warnings.ts), the
-- *column itself* must still be kept so the SELECT/INSERT shapes stay
-- in sync with Supabase's REST output (the snapshot bootstrap pulls
-- the full row payload and would otherwise fail with "no such column:
-- role_group_id" on the local INSERT). A previous hand-edit dropped
-- both the column and the index together; re-added here, with only the
-- FK clause stripped. Referential integrity for `role_group_id` is now
-- enforced by Postgres + the sync engine, not by the SQLite mirror.
alter table workspace_memberships
add column updated_at timestamptz not null default current_timestamp;

alter table workspace_memberships
add column role_group_id uuid;

create index if not exists idx_workspace_memberships__role_group_id on workspace_memberships (
  role_group_id
);
