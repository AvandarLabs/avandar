-- Generated from supabase/migrations/20260819053812_generalize_open_data_catalog_access.sql by
-- apps/desktop/scripts/gen-sqlite-migrations/. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: 6
-- Statements dropped (RLS/funcs/triggers/data/etc.): 5
-- FK constraints dropped (target not synced to SQLite): 0
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): 6
-- SQLite override. The Postgres migration relaxes three NOT NULL columns, which
-- SQLite's ALTER TABLE cannot do: it supports RENAME / ADD COLUMN / DROP COLUMN
-- only, so the table is rebuilt. The generator routes ALTER COLUMN to
-- needsHandEdit for exactly this reason.
--
-- Relaxing them is not cosmetic drift. `catalog_entries__open_data` is listed in
-- apps/desktop/sync/syncable-tables.ts, so rows arrive here from Postgres, and
-- an API-backed entry has no Parquet object and no pipeline. Left NOT NULL, its
-- insert would fail on the desktop client only.
--
-- Two Postgres constructs are deliberately not mirrored:
--
--   * `create type ... as enum`. SQLite has no enums, so `access_kind` and
--     `api_service` are TEXT. Postgres constrains the values upstream and this
--     mirror has no write path of its own.
--   * The three CHECK constraints. SQLite cannot ALTER TABLE ADD CONSTRAINT, and
--     rows only ever arrive from a Postgres that already validated them. This
--     follows the same reasoning as the dashboard snapshot transition override.
--
-- `unique_parquet_file_pipeline` is preserved. It is the index the World Bank
-- pipeline's upsert infers on the Postgres side, and dropping it here would let
-- the mirror hold duplicate pipeline rows Postgres would have rejected.
--
create table "catalog_entries__open_data__rebuild" (
  "id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "date_of_last_sync" TIMESTAMPTZ,
  "date_of_last_update" TIMESTAMPTZ,
  "coverage_start_date" TIMESTAMPTZ,
  "coverage_end_date" TIMESTAMPTZ,
  "external_organization_name" TEXT NOT NULL,
  "external_service_name" TEXT,
  "external_dataset_id" TEXT,
  "source_url" TEXT,
  "canonical_urls" TEXT,
  "license" TEXT,
  "update_frequency" TEXT,
  "description" TEXT,
  "notes" TEXT,
  "metadata" JSONB,
  "pipeline_name" TEXT,
  "pipeline_run_id" TEXT,
  "display_name" TEXT NOT NULL,
  "parquet_file_name" TEXT,
  "access_kind" TEXT NOT NULL DEFAULT 'pipeline_parquet',
  "api_service" TEXT,
  "api_base_url" TEXT,
  "api_resource_id" TEXT,
  "api_resource_format" TEXT
);

insert into
  "catalog_entries__open_data__rebuild" (
    "id",
    "created_at",
    "updated_at",
    "date_of_last_sync",
    "date_of_last_update",
    "coverage_start_date",
    "coverage_end_date",
    "external_organization_name",
    "external_service_name",
    "external_dataset_id",
    "source_url",
    "canonical_urls",
    "license",
    "update_frequency",
    "description",
    "notes",
    "metadata",
    "pipeline_name",
    "pipeline_run_id",
    "display_name",
    "parquet_file_name"
  )
select
  "id",
  "created_at",
  "updated_at",
  "date_of_last_sync",
  "date_of_last_update",
  "coverage_start_date",
  "coverage_end_date",
  "external_organization_name",
  "external_service_name",
  "external_dataset_id",
  "source_url",
  "canonical_urls",
  "license",
  "update_frequency",
  "description",
  "notes",
  "metadata",
  "pipeline_name",
  "pipeline_run_id",
  "display_name",
  "parquet_file_name"
from
  "catalog_entries__open_data";

drop table "catalog_entries__open_data";

alter table "catalog_entries__open_data__rebuild" rename to "catalog_entries__open_data";

create unique index "catalog_entries__open_data_pkey" on "catalog_entries__open_data" ("id");

create unique index "unique_parquet_file_pipeline" on "catalog_entries__open_data" ("parquet_file_name", "pipeline_name");

create unique index "catalog_entries__open_data__api_resource_unique" on "catalog_entries__open_data" (
  "api_service",
  "api_base_url",
  "external_dataset_id",
  "api_resource_id"
)
where
  "access_kind" = 'api_resource';
