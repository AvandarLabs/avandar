import { isGlobalSchemaShape } from "./parse";
import type {
  PartitionResult,
  PartitionStatementsOptions,
  Statement,
} from "./types";

/**
 * Partition statements by what the SQLite mirror should do with them.
 *
 * - `kind === "drop"` -> `skipped` (Postgres-only construct).
 * - `kind === "unknown"` -> `unknown` (block generation).
 * - `kind === "schema-shape"` with no detectable primary table ->
 *   `unknown` unless the statement is global (e.g. `DROP INDEX`).
 * - Primary table in `EXCLUDED_TABLES` -> `skipped` (we do not mirror
 *   that table).
 * - Primary table not in `SYNCABLE_TABLES` or `EXCLUDED_TABLES` ->
 *   `unknown` (the manifest needs an entry).
 * - Primary table in `SYNCABLE_TABLES` with at least one FK target
 *   that is cross-schema or non-syncable -> `droppedFks` (we drop the
 *   whole constraint; SQLite cannot enforce a FK to a table it does
 *   not have).
 * - Primary table in `SYNCABLE_TABLES`, every FK target also in
 *   `SYNCABLE_TABLES`, but SQLite cannot accept the statement
 *   (`ALTER TABLE ... ADD CONSTRAINT ...`, `ALTER COLUMN`) ->
 *   `needsHandEdit`.
 * - Everything else passing the above -> `included`.
 *
 * @param options - Parsed statements plus the syncable / excluded manifest.
 * @returns The five buckets. `unknown` being non-empty is a generator
 *   error in the orchestration layer; the function itself does not throw.
 */
export function partitionStatements(
  options: Readonly<PartitionStatementsOptions>,
): PartitionResult {
  const { statements, syncable, excluded } = options;
  const syncableSet = new Set(syncable);
  const excludedSet = new Set(excluded);
  const included: Statement[] = [];
  const skipped: Statement[] = [];
  const droppedFks: Statement[] = [];
  const needsHandEdit: Statement[] = [];
  const unknown: Statement[] = [];

  statements.forEach((stmt) => {
    if (stmt.kind === "drop") {
      skipped.push(stmt);
      return;
    }
    if (stmt.kind === "unknown") {
      unknown.push(stmt);
      return;
    }
    // schema-shape from here on
    if (stmt.primaryTable === undefined) {
      // Some schema-shape statements name no table (e.g. DROP INDEX in
      // Postgres, where the index name alone is enough). Include those
      // verbatim; SQLite ignores DROP INDEX IF EXISTS for unknown
      // names.
      if (isGlobalSchemaShape(stmt.sql)) {
        included.push(stmt);
        return;
      }
      unknown.push(stmt);
      return;
    }
    if (excludedSet.has(stmt.primaryTable)) {
      skipped.push(stmt);
      return;
    }
    if (!syncableSet.has(stmt.primaryTable)) {
      unknown.push(stmt);
      return;
    }
    const fkToNonSyncable = stmt.fkReferences.some((ref) => {
      if (ref.schema !== undefined) {
        return true;
      }
      return !syncableSet.has(ref.table);
    });
    if (fkToNonSyncable) {
      // FK target does not exist locally; statement can't be preserved
      // even by a hand-edit. Route to its own bucket so the runner can
      // surface a friendly informational notice rather than silently
      // dropping.
      droppedFks.push(stmt);
      return;
    }
    // ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY is schema-shape
    // we want, but SQLite only accepts FKs inline inside CREATE TABLE.
    // Surface for a hand-edit instead of silently dropping.
    if (_needsHandEdit(stmt)) {
      needsHandEdit.push(stmt);
      return;
    }
    included.push(stmt);
  });

  return { included, skipped, droppedFks, needsHandEdit, unknown };
}

function _needsHandEdit(stmt: Readonly<Statement>): boolean {
  // SQLite's ALTER TABLE only supports RENAME / ADD COLUMN / DROP
  // COLUMN. Anything else against a still-existing CREATE TABLE must
  // be inlined into the CREATE TABLE by hand:
  //
  // - `ADD CONSTRAINT` (FK, CHECK, PRIMARY KEY, UNIQUE) - the earlier
  //   classifier already drops the `USING INDEX` flavour, so anything
  //   left here is a real constraint.
  // - `ALTER COLUMN` (type change, SET/DROP DEFAULT, SET/DROP NOT
  //   NULL) - SQLite has no equivalent verb at all.
  if (!/^\s*alter\s+table\b/i.test(stmt.sql)) {
    return false;
  }
  if (/\badd\s+constraint\b/i.test(stmt.sql)) {
    return true;
  }
  if (/\balter\s+column\b/i.test(stmt.sql)) {
    return true;
  }
  return false;
}
