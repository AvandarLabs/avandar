-- Generated from supabase/migrations/20260518000010_drop_resource_user_group_tags_table.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 3
-- Statements dropped (RLS/funcs/triggers/data/etc.): 32
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
DROP INDEX IF EXISTS "idx_resource_user_group_tags__resource";

DROP INDEX IF EXISTS "resource_user_group_tags__resource_tag";

DROP INDEX IF EXISTS "resource_user_group_tags_pkey";
