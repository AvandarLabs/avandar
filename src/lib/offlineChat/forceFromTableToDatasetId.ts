/**
 * Replaces FROM/JOIN table identifiers that are not workspace dataset ids.
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

  let sql = args.sql.replace(
    /\b(FROM|JOIN)\s+"([^"]+)"/gi,
    (full, keyword: string, tableName: string) => {
      return replaceTable(full, keyword, tableName);
    },
  );

  sql = sql.replace(
    /\b(FROM|JOIN)\s+`([^`]+)`/gi,
    (full, keyword: string, tableName: string) => {
      return replaceTable(full, keyword, tableName);
    },
  );

  sql = sql.replace(
    /\b(FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b(?!\s*\()/gi,
    (full, keyword: string, tableName: string) => {
      return replaceTable(full, keyword, tableName);
    },
  );

  return { sql, changed };
}
