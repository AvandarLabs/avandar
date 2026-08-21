-- Generated from supabase/migrations/20260815141744_analytics_growth_events_and_waitlist_removal.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 3
-- Statements dropped (RLS/funcs/triggers/data/etc.): 76
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
DROP INDEX IF EXISTS "waitlist_signups_email_key";

DROP INDEX IF EXISTS "waitlist_signups_pkey";

DROP INDEX IF EXISTS "waitlist_signups_signup_code_key";
