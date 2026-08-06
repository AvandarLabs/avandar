-- Grant table privileges to the standard Supabase roles for the granular
-- permissions tables introduced in
-- `20260511194500_granular_permissions_phase1.sql`.
--
-- That migration was hand-written and created these tables with `create table`
-- but, unlike the `supabase db diff`-generated migrations for every other
-- table, it omitted the accompanying grant statements. As a result these tables
-- were left without SELECT/INSERT/UPDATE/DELETE for `anon`, `authenticated`, or
-- `service_role`, so even the service-role seed script hit
-- `permission denied for table role_groups` (SQLSTATE 42501) during
-- `pnpm db:reset`.
--
-- These grants match what the sibling tables (e.g. `workspaces`,
-- `workspace_invites`) already have. Row-level security remains enabled on each
-- table, so per-row access is still governed by the existing RLS policies.

grant all on table "public"."role_groups" to "anon", "authenticated", "service_role";
grant all on table "public"."role_group_app_roles" to "anon", "authenticated", "service_role";
grant all on table "public"."user_groups" to "anon", "authenticated", "service_role";
grant all on table "public"."user_group_memberships" to "anon", "authenticated", "service_role";
grant all on table "public"."resource_shares" to "anon", "authenticated", "service_role";
