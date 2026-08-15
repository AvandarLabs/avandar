const _MANUAL_MIGRATION_BODIES: Record<string, string> = {
  "20260814175823_dashboard_visibility_model.sql": `-- SQLite override. Two constructs do not survive the Postgres -> SQLite transpile:
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
  "20260815022608_add_dashboard_snapshot_revision.sql": `-- SQLite override. The Postgres migration backfills a reserved legacy revision with
-- UPDATE, which the schema-only generator intentionally drops. Desktop must
-- apply the same data transition so existing published rows keep reading their
-- unversioned snapshot objects after the revision column is introduced.
--
alter table "dashboards" add column "snapshot_revision" text;

update "dashboards"
set "snapshot_revision" = '00000000-0000-0000-0000-000000000000'
where "visibility" <> 'draft' and "snapshot_revision" is null;
`,
  "20260815042008_durable_dashboard_snapshot_transitions.sql": `-- SQLite override. SQLite has no enum types, and the desktop dashboard mirror is
-- read-only. The five nullable TEXT columns preserve the durable transition
-- state exactly; historical rows remain deterministically idle as NULL.
--
alter table "dashboards" add column "snapshot_transition_kind" text;
alter table "dashboards" add column "snapshot_transition_prior_revision" text;
alter table "dashboards" add column "snapshot_transition_prior_visibility" text;
alter table "dashboards" add column "snapshot_transition_revision" text;
alter table "dashboards" add column "snapshot_transition_target_visibility" text;
`,
  "20260815042815_strengthen_dashboard_snapshot_transition_boundary.sql": `-- SQLite override. The desktop dashboard mirror is read-only, so the Postgres
-- transition consistency CHECK has no SQLite write path to constrain.
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
