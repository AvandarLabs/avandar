-- Generated from supabase/migrations/20260511194500_granular_permissions_phase1.sql by
-- apps/desktop/scripts/gen-sqlite-migrations.ts. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 71
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
ALTER TABLE dashboards ADD COLUMN is_restricted INTEGER NOT NULL DEFAULT FALSE;

ALTER TABLE datasets ADD COLUMN is_restricted INTEGER NOT NULL DEFAULT FALSE;
