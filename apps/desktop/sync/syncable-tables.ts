/*
 * Source of truth for which Supabase tables the desktop mirrors to local
 * SQLite. The Postgres -> SQLite migration generator reads this manifest
 * and hard-errors when it encounters a CREATE/ALTER TABLE statement for a
 * table that is not listed in either set; the snapshot bootstrap reads it
 * to know which tables to pull on first launch.
 *
 * Edit when adding a new table to `supabase/migrations/`:
 *   - User-owned artifact the desktop must render offline -> add to
 *     ACTIVE_TABLES.
 *   - Collaborative state, server-of-truth data, billing, audit, or
 *     permissions glue -> add to EXCLUDED_TABLES.
 *
 * Defaulting to "conservative" (excluded) is safer; the desktop just won't
 * be able to render that table's data offline until it is promoted to
 * ACTIVE_TABLES with a per-row sync strategy.
 *
 * Today's split (every entry is a judgment call, review in the PR):
 *   - ACTIVE: dataset definitions and their per-format detail rows,
 *     catalog entries, dashboards, entities + configs + field values,
 *     value extractors, user profile, plus `workspaces` and
 *     `workspace_memberships` so the workspace picker renders offline.
 *   - EXCLUDED: collaborative invitation state, permissions tables,
 *     billing, sensitive OAuth tokens, admin-only signups, legacy role
 *     tables, and the web-only `dexie_dbs` tracker.
 */

/**
 * Tables that exist in the current Postgres schema and that the desktop
 * mirrors to local SQLite. New syncable tables should land here.
 */
const ACTIVE_TABLES = [
  "datasets",
  "dataset_columns",
  "datasets__csv_file",
  "datasets__google_sheets",
  "datasets__open_data",
  "datasets__virtual",
  "datasets__xlsx_file",
  "catalog_entries__open_data",
  "catalog_entries__dataset_column",
  "dashboards",
  "entities",
  "entity_configs",
  "entity_field_configs",
  "value_extractors__dataset_column_value",
  "value_extractors__manual_entry",
  "user_profiles",
  "workspaces",
  "workspace_memberships",
] as const;

/*
 * Tables that USED TO exist in the Postgres schema and were syncable
 * while they were live, but have since been dropped or renamed.
 *
 * Why keep them?
 *
 * The migration generator processes the full Postgres history one file
 * at a time. Early migrations contain CREATE TABLE / ALTER TABLE /
 * CREATE INDEX statements for these tables, and intermediate migrations
 * may reference them in FK clauses before the final DROP TABLE lands.
 * If a deprecated name disappears from the manifest, the generator
 * hard-errors with "uncategorised table" the moment it walks past one
 * of those historical statements - even though the runtime SQLite
 * schema will never see the table.
 *
 * Listing the historical names here lets the generator recognise the
 * statements as syncable-at-the-time, transpile them, and emit them
 * to the matching `.gen.sql`. The SQLite migration runner then
 * applies the CREATE-then-eventually-DROP pair the same way Postgres
 * did, so the local schema stays in step with what Postgres ended up
 * with.
 *
 * Add an entry here when a Postgres migration drops a table that was
 * previously in ACTIVE_TABLES. Never remove an entry - that breaks
 * historical-migration parsing.
 */
const DEPRECATED_TABLES = [
  // Dropped by 20250929162612 ("Adding support for optimized datasets"),
  // replaced by the unified datasets / datasets__csv_file model.
  "datasets__local_csv",
  // Renamed to `datasets__xlsx_file` by 20260504000020. Both names
  // need to be recognised so the rename ALTER TABLEs partition
  // cleanly.
  "datasets__xls_file",
  // Dropped by 20250929162612, folded into the unified datasets model.
  "entity_field_values",
  // Dropped by 20251101021213 ("Added aggregation support for value
  // extractors"); aggregation was re-implemented without a dedicated
  // table.
  "value_extractors__aggregation",
] as const;

/**
 * Tables that the desktop mirrors to local SQLite. Union of
 * {@link ACTIVE_TABLES} (still in the live schema) and
 * {@link DEPRECATED_TABLES} (referenced by Postgres migration history,
 * preserved here so the generator's per-file partition step does not
 * hard-error on legacy DDL).
 *
 * For now, syncing is a one-shot Supabase REST pull on first launch;
 * incremental sync layers on top later.
 */
export const SYNCABLE_TABLES = [
  ...ACTIVE_TABLES,
  ...DEPRECATED_TABLES,
] as const;

/**
 * Tables that the desktop intentionally does not mirror. Listed explicitly
 * so the migration generator can distinguish "deliberately excluded" from
 * "unhandled new table" and hard-error on the latter.
 */
export const EXCLUDED_TABLES = [
  "dexie_dbs",
  "subscriptions",
  "tokens__google",
  "usage_analytics_events",
  "user_roles",
  "workspace_invites",
  "role_groups",
  "role_group_app_roles",
  "user_app_roles",
  "user_groups",
  "user_group_memberships",
  "resource_user_group_tags",
  "resource_shares",
] as const;

/**
 * Narrowed literal union of every table the desktop syncs. Useful for
 * downstream code that wants to switch on table name with exhaustiveness.
 */
export type SyncableTable = (typeof SYNCABLE_TABLES)[number];

/**
 * Narrowed literal union of every table deliberately excluded from sync.
 */
export type ExcludedTable = (typeof EXCLUDED_TABLES)[number];

/**
 * True iff `tableName` is mirrored to local SQLite on desktop.
 *
 * @param tableName - Snake-case Postgres table name to check.
 * @returns Whether the table appears in {@link SYNCABLE_TABLES}.
 */
export function isSyncable(tableName: string): boolean {
  return (SYNCABLE_TABLES as readonly string[]).includes(tableName);
}

/**
 * True iff `tableName` is deliberately excluded from the desktop sync.
 * Used by the migration generator to distinguish "skip this statement"
 * from "this table has never been categorised, fail loudly".
 *
 * @param tableName - Snake-case Postgres table name to check.
 * @returns Whether the table appears in {@link EXCLUDED_TABLES}.
 */
export function isExcluded(tableName: string): boolean {
  return (EXCLUDED_TABLES as readonly string[]).includes(tableName);
}
