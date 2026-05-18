-- Generated from supabase/migrations/20260511194500_granular_permissions_phase1.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 71
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
alter table dashboards
add column is_restricted integer not null default false;

alter table datasets
add column is_restricted integer not null default false;
