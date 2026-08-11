import { isDefined, matchLiteral } from "@avandar/utils";
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import type {
  DashboardFilterRecord,
  DashboardFilterValue,
} from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";

function _formatSqlLiteral(value: string | number | boolean): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  return `'${value.replace(/'/g, "''")}'`;
}

function _isValueSet(value: DashboardFilterValue): boolean {
  return (
    value === undefined ? false
    : Array.isArray(value) ? value.length > 0
    : typeof value === "string" ? value.trim().length > 0
    : true
  );
}

function _filterToWhereClause(
  filter: DashboardFilterRecord,
): string | undefined {
  if (!_isValueSet(filter.value)) {
    return undefined;
  }
  const columnName = quoteSqlIdentifier(filter.columnName);
  return matchLiteral(filter.operator, {
    in: () => {
      const values =
        Array.isArray(filter.value) ? filter.value : [filter.value];
      const formattedValues = values
        .filter(isDefined)
        .map(_formatSqlLiteral)
        .join(", ");
      return `${columnName} IN (${formattedValues})`;
    },
    contains: () => {
      const escapedValue = String(filter.value).replace(/'/g, "''");
      return `${columnName} ILIKE '%${escapedValue}%'`;
    },
    equals: () => {
      const value =
        Array.isArray(filter.value) ? filter.value[0] : filter.value;
      return value === undefined ? undefined : (
          `${columnName} = ${_formatSqlLiteral(value)}`
        );
    },
  });
}

/**
 * Amend a SQL query with viewer-selected dashboard filters by wrapping the
 * original query in a subselect. This keeps the original SQL untouched and
 * works for any SELECT (including ones with their own WHERE / GROUP BY).
 *
 * Returns the original SQL untouched when no active filters apply.
 */
export function applyDashboardFiltersToSql(
  options: Readonly<{
    sql: string;
    filters: readonly DashboardFilterRecord[];
    /**
     * Optional whitelist of filter ids. Omission applies every active filter.
     */
    subscribedFilterIds?: readonly string[];
  }>,
): string {
  const { sql, filters, subscribedFilterIds } = options;
  const subscribedFilterIdSet =
    subscribedFilterIds ? new Set(subscribedFilterIds) : undefined;
  const applicableFilters = filters.filter((filter) => {
    if (subscribedFilterIdSet && !subscribedFilterIdSet.has(filter.filterId)) {
      return false;
    }
    return _isValueSet(filter.value);
  });
  if (applicableFilters.length === 0) {
    return sql;
  }
  const whereClauses = applicableFilters
    .map(_filterToWhereClause)
    .filter(isDefined);
  if (whereClauses.length === 0) {
    return sql;
  }
  const trimmed = sql.trim().replace(/;\s*$/u, "");
  // Wrap the entire query in a subselect so dashboard filters compose
  // correctly with whatever WHERE/GROUP BY/etc. the inner query already has.
  return `SELECT * FROM (${trimmed}) AS _ava_filtered WHERE ${whereClauses.join(" AND ")}`;
}
