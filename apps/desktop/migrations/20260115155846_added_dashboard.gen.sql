-- Generated from supabase/migrations/20260115155846_added_dashboard.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 4
-- Statements dropped (RLS/funcs/triggers/data/etc.): 32
-- FK constraints dropped (target not synced to SQLite): 1
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 2
create table "dashboards" (
  "id" uuid not null,
  "workspace_id" uuid not null,
  "owner_id" uuid not null,
  "owner_profile_id" uuid not null,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "name" text not null,
  "description" text,
  "is_public" integer not null default false,
  "slug" text,
  "config" jsonb not null
);

create unique index dashboards__workspace_id_slug on dashboards (
  workspace_id,
  slug
);

create unique index dashboards_pkey on dashboards (id);

create index idx_dashboards__slug on dashboards (slug);
