-- Generated from supabase/migrations/20251119215736_added_subscriptions.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 37
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
alter table "user_profiles"
add column "polar_product_id" uuid;

alter table "user_profiles"
add column "subscription_id" uuid;
