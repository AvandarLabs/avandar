/**
 * Rewrites disallowed FROM and JOIN table references to the target dataset ID.
 * Returns the SQL and whether a reference changed.
 * Use it, for example, to repair generated SQL that names an invented table.
 */
export function forceFromTableToDatasetId(args: {
  sql: string;
  datasetTableId: string;
  allowedTableIds: ReadonlySet<string>;
}): { sql: string; changed: boolean } {
  let changed = false;

  const replaceTable = (
    full: string,
    keyword: string,
    tableName: string,
  ): string => {
    if (
      tableName === args.datasetTableId ||
      args.allowedTableIds.has(tableName)
    ) {
      return full;
    }
    changed = true;
    return `${keyword} "${args.datasetTableId}"`;
  };

  const sql = args.sql
    .replace(/\b(FROM|JOIN)\s+"([^"]+)"/gi, replaceTable)
    .replace(/\b(FROM|JOIN)\s+`([^`]+)`/gi, replaceTable)
    .replace(
      /\b(FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b(?!\s*\()/gi,
      replaceTable,
    );

  return { sql, changed };
}
