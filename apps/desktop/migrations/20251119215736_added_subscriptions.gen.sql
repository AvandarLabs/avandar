-- Generated from supabase/migrations/20251119215736_added_subscriptions.sql by
-- apps/desktop/scripts/gen-sqlite-migrations.ts. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 2
-- Statements dropped (RLS/funcs/triggers/data/etc.): 37
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
ALTER TABLE "user_profiles" ADD COLUMN "polar_product_id" UUID;

ALTER TABLE "user_profiles" ADD COLUMN "subscription_id" UUID;
