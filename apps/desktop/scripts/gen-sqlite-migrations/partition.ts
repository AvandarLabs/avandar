import type {
  PartitionResult,
  PartitionStatementsOptions,
  Statement,
} from "./types";

import { makeBucketRecord } from "@avandar/utils";

import { isGlobalSchemaShape } from "./parse";

function _getStatementPartition(
  options: Readonly<{
    statement: Statement;
    syncableSet: ReadonlySet<string>;
    excludedSet: ReadonlySet<string>;
  }>,
): keyof PartitionResult {
  const { statement, syncableSet, excludedSet } = options;
  if (statement.kind === "drop") {
    return "skipped";
  }
  if (statement.kind === "unknown") {
    return "unknown";
  }
  if (statement.primaryTable === undefined) {
    return isGlobalSchemaShape(statement.sql) ? "included" : "unknown";
  }
  if (excludedSet.has(statement.primaryTable)) {
    return "skipped";
  }
  if (!syncableSet.has(statement.primaryTable)) {
    return "unknown";
  }
  const hasForeignKeyToNonSyncableTable = statement.fkReferences.some(
    (reference) => {
      return (
        reference.schema !== undefined || !syncableSet.has(reference.table)
      );
    },
  );
  if (hasForeignKeyToNonSyncableTable) {
    return "droppedForeignKeys";
  }
  return _needsHandEdit(statement) ? "needsHandEdit" : "included";
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

/**
 * Partitions statements by how the SQLite mirror should handle them.
 * Returns the included, skipped, hand-edit, dropped-FK, and unknown buckets.
 */
export function partitionStatements(
  options: Readonly<PartitionStatementsOptions>,
): PartitionResult {
  const { statements, syncable, excluded } = options;
  const syncableSet = new Set(syncable);
  const excludedSet = new Set(excluded);
  const buckets = makeBucketRecord(statements, {
    keyFn: (statement) => {
      return _getStatementPartition({ statement, syncableSet, excludedSet });
    },
  });
  return {
    included: buckets.included ?? [],
    skipped: buckets.skipped ?? [],
    droppedForeignKeys: buckets.droppedForeignKeys ?? [],
    needsHandEdit: buckets.needsHandEdit ?? [],
    unknown: buckets.unknown ?? [],
  };
}
