type FromEntry = Record<string, unknown>;

/**
 * Removes `schema.table` (and deeper) qualifiers from FROM/JOIN in raw SQL so
 * offline repair can match Avandar dataset names.
 */
export function stripQualifiedTableNamespacesInSql(sql: string): string {
  const qualifierSegment =
    "(?:\"[^\"]+\"|'[^']+'|`[^`]+`|\\[[^\\]]+\\]|[a-zA-Z_][a-zA-Z0-9_]*)";
  const tableSegment =
    "(?:\"([^\"]+)\"|'([^']+)'|`([^`]+)`|\\[([^\\]]+)\\]|([a-zA-Z_][a-zA-Z0-9_]*))";
  const qualifiedFromPattern = new RegExp(
    `\\b(FROM|JOIN)\\s+(?:(?:${qualifierSegment})\\s*\\.\\s*)+${tableSegment}`,
    "gi",
  );

  return sql.replace(
    qualifiedFromPattern,
    (
      _match,
      keyword: string,
      dq?: string,
      sq?: string,
      bq?: string,
      bracket?: string,
      bare?: string,
    ) => {
      const tableName = dq ?? sq ?? bq ?? bracket ?? bare ?? "";
      if (!tableName) {
        return _match;
      }
      if (dq !== undefined) {
        return `${keyword} "${tableName}"`;
      }
      if (sq !== undefined) {
        return `${keyword} '${tableName}'`;
      }
      if (bq !== undefined) {
        return `${keyword} \`${tableName}\``;
      }
      if (bracket !== undefined) {
        return `${keyword} [${tableName}]`;
      }
      return `${keyword} ${tableName}`;
    },
  );
}

/**
 * Clears `db` (and similar namespace fields) on node-sql-parser FROM entries so
 * `table` holds only the dataset name segment.
 */
export function stripTableNamespacesInFromList(fromList: unknown): boolean {
  if (!Array.isArray(fromList)) {
    return false;
  }
  let changed = false;
  for (const rawItem of fromList) {
    const item = rawItem as FromEntry;
    if (typeof item.db === "string" && item.db.length > 0) {
      delete item.db;
      changed = true;
    }
    if (typeof item.schema === "string" && item.schema.length > 0) {
      delete item.schema;
      changed = true;
    }
  }
  return changed;
}

/**
 * Strips namespace fields from a parsed SELECT AST (call before dataset remap).
 */
export function stripTableNamespacesInSelectAst(
  ast: Record<string, unknown>,
): boolean {
  if (ast.type !== "select") {
    return false;
  }
  return stripTableNamespacesInFromList(ast.from);
}
