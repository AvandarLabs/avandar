const _MANUAL_MIGRATION_BODIES: Record<string, string> = {
  "20260816020000_dashboard_visibility_model.sql": `-- SQLite override. Two constructs do not survive the Postgres -> SQLite transpile:
--
--   * \`create type ... as enum\`. SQLite has no enums, so \`visibility\` is TEXT.
--     The values are still constrained upstream by Postgres, and the mirror is
--     read-only for the desktop client.
--   * \`generated always as (...) stored\`. SQLite supports generated columns,
--     but ALTER TABLE ADD COLUMN accepts only VIRTUAL. VIRTUAL is
--     read-identical for every consumer of \`is_public\`.
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
`,
  "20260816020100_add_dashboard_snapshot_revision.sql": `-- SQLite override. The Postgres migration backfills a reserved legacy revision with
-- UPDATE, which the schema-only generator intentionally drops. Desktop must
-- apply the same data transition so existing published rows keep reading their
-- unversioned snapshot objects after the revision column is introduced.
--
alter table "dashboards" add column "snapshot_revision" text;

update "dashboards"
set "snapshot_revision" = '00000000-0000-0000-0000-000000000000'
where "visibility" <> 'draft' and "snapshot_revision" is null;
`,
  "20260816020200_dashboard_snapshot_transitions.sql": `-- SQLite override. SQLite has no enum types, and the desktop dashboard mirror is
-- read-only. The five nullable TEXT columns preserve the durable transition
-- state exactly; historical rows remain deterministically idle as NULL. Column
-- order follows the Postgres migration.
--
-- \`snapshot_transition_kind\` mirrors the \`dashboard_snapshot_transition_kind\`
-- enum and the two \`..._visibility\` columns mirror \`dashboard_visibility\`;
-- all three are TEXT here for the same reason \`visibility\` is.
--
-- The Postgres migration also adds two CHECK constraints,
-- \`dashboards__snapshot_transition_consistent\` and
-- \`dashboards__settled_snapshot_consistent\` (each \`not valid\`, then a
-- \`validate constraint\` pass). Neither is mirrored, for two reasons: SQLite
-- cannot ALTER TABLE ADD CONSTRAINT at all, and the mirror has no write path,
-- so there is no INSERT or UPDATE for either invariant to constrain. Rows only
-- ever arrive from a Postgres that already enforced both. The \`validate
-- constraint\` statements are likewise dropped; they have no SQLite meaning.
--
alter table "dashboards" add column "snapshot_transition_kind" text;
alter table "dashboards" add column "snapshot_transition_revision" text;
alter table "dashboards" add column "snapshot_transition_prior_revision" text;
alter table "dashboards" add column "snapshot_transition_prior_visibility" text;
alter table "dashboards" add column "snapshot_transition_target_visibility" text;
`,
  "20260819053812_generalize_open_data_catalog_access.sql": `-- SQLite override. The Postgres migration relaxes three NOT NULL columns, which
-- SQLite's ALTER TABLE cannot do: it supports RENAME / ADD COLUMN / DROP COLUMN
-- only, so the table is rebuilt. The generator routes ALTER COLUMN to
-- needsHandEdit for exactly this reason.
--
-- Relaxing them is not cosmetic drift. \`catalog_entries__open_data\` is listed in
-- apps/desktop/sync/syncable-tables.ts, so rows arrive here from Postgres, and
-- an API-backed entry has no Parquet object and no pipeline. Left NOT NULL, its
-- insert would fail on the desktop client only.
--
-- Two Postgres constructs are deliberately not mirrored:
--
--   * \`create type ... as enum\`. SQLite has no enums, so \`access_kind\` and
--     \`api_service\` are TEXT. Postgres constrains the values upstream and this
--     mirror has no write path of its own.
--   * The three CHECK constraints. SQLite cannot ALTER TABLE ADD CONSTRAINT, and
--     rows only ever arrive from a Postgres that already validated them. This
--     follows the same reasoning as the dashboard snapshot transition override.
--
-- \`unique_parquet_file_pipeline\` is preserved. It is the index the World Bank
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
`,
};

/**
 * Returns a checked-in SQLite body for a Postgres migration whose SQL cannot
 * be transpiled correctly. Overrides keep regeneration and drift checks
 * reproducible without weakening either workflow for unrelated migrations.
 *
 * @param sourceFile - The Postgres migration basename being generated.
 * @returns The SQLite body when an override exists, otherwise `undefined`.
 */
export function getManualMigrationBodyFromSourceFile(
  sourceFile: string,
): string | undefined {
  return _MANUAL_MIGRATION_BODIES[sourceFile];
}
