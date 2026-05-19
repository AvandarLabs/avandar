import type {
  DashboardFilterRecord,
  DashboardFilterValue,
} from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";

function _quoteSqlIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function _formatSqlLiteral(value: string | number | boolean | null): string {
  if (value === null) {
    return "NULL";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  return `'${value.replace(/'/g, "''")}'`;
}

function _isValueSet(value: DashboardFilterValue): boolean {
  if (value === undefined) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return true;
}

function _filterToWhereClause(
  filter: DashboardFilterRecord,
): string | undefined {
  if (!_isValueSet(filter.value)) {
    return undefined;
  }
  const col = _quoteSqlIdentifier(filter.columnName);

  if (filter.operator === "in") {
    const values: ReadonlyArray<string | number> = Array.isArray(filter.value)
      ? filter.value
      : [filter.value as string | number];
    const formatted = values
      .map((v) => {
        return _formatSqlLiteral(v);
      })
      .join(", ");
    return `${col} IN (${formatted})`;
  }

  if (filter.operator === "contains") {
    const v = String(filter.value).replace(/'/g, "''");
    return `${col} ILIKE '%${v}%'`;
  }

  // Default: equals.
  const v = Array.isArray(filter.value) ? filter.value[0] : filter.value;
  if (v === undefined) {
    return undefined;
  }
  return `${col} = ${_formatSqlLiteral(v as string | number | boolean | null)}`;
}

/**
 * Amend a SQL query with viewer-selected dashboard filters by wrapping the
 * original query in a subselect. This keeps the original SQL untouched and
 * works for any SELECT (including ones with their own WHERE / GROUP BY).
 *
 * Returns the original SQL untouched when no active filters apply.
 */
export function applyDashboardFiltersToSql(options: {
  sql: string;
  filters: readonly DashboardFilterRecord[];
  /**
   * Optional whitelist of filter ids that this block subscribes to. When
   * omitted, all filters apply (the default for the demo). DataViz blocks
   * can pass a subset to opt out of specific global filters in the future.
   */
  subscribedFilterIds?: readonly string[];
}): string {
  const { sql, filters, subscribedFilterIds } = options;
  const applicable = filters.filter((f) => {
    if (subscribedFilterIds && !subscribedFilterIds.includes(f.filterId)) {
      return false;
    }
    return _isValueSet(f.value);
  });
  if (applicable.length === 0) {
    return sql;
  }
  const clauses = applicable
    .map((f) => {
      return _filterToWhereClause(f);
    })
    .filter((c): c is string => {
      return typeof c === "string";
    });
  if (clauses.length === 0) {
    return sql;
  }
  const trimmed = sql.trim().replace(/;\s*$/u, "");
  // Wrap the entire query in a subselect so dashboard filters compose
  // correctly with whatever WHERE/GROUP BY/etc. the inner query already has.
  return `SELECT * FROM (${trimmed}) AS _ava_filtered WHERE ${clauses.join(" AND ")}`;
}
