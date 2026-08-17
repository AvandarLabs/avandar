-- Generated from supabase/migrations/20260813150000_private_resource_permissions_hardening.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 28
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
CREATE INDEX idx_dashboards__workspace_owner ON dashboards(workspace_id, owner_id);

CREATE INDEX idx_datasets__workspace_owner ON datasets(workspace_id, owner_id);
