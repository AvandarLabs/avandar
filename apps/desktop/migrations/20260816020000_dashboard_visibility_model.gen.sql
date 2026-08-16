-- Generated from supabase/migrations/20260816020000_dashboard_visibility_model.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 6
-- Statements dropped (RLS/funcs/triggers/data/etc.): 6
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 0
-- SQLite override. Two constructs do not survive the Postgres -> SQLite transpile:
--
--   * `create type ... as enum`. SQLite has no enums, so `visibility` is TEXT.
--     The values are still constrained upstream by Postgres, and the mirror is
--     read-only for the desktop client.
--   * `generated always as (...) stored`. SQLite supports generated columns,
--     but ALTER TABLE ADD COLUMN accepts only VIRTUAL. VIRTUAL is
--     read-identical for every consumer of `is_public`.
--
-- apps/desktop/scripts/gen-sqlite-migrations does not flag either case:
-- partition.ts routes only ADD CONSTRAINT and ALTER COLUMN to needsHandEdit,
-- and both statements here are ADD COLUMN.
--
alter table "dashboards" add column "visibility" text not null default 'draft';

update "dashboards" set "visibility" = 'public' where "is_public" = 1;

drop index if exists "dashboards__slug_unique_when_public";

alter table "dashboards" drop column "is_public";

alter table "dashboards" add column "is_public" integer generated always as (
  case when "visibility" = 'public' then 1 else 0 end
) virtual;

create unique index "dashboards__slug_unique_when_public"
on "dashboards" ("slug")
where "visibility" = 'public' and "slug" is not null;

create unique index "dashboards__slug_unique_per_workspace_when_internal"
on "dashboards" ("workspace_id", "slug")
where "visibility" = 'workspace' and "slug" is not null;
