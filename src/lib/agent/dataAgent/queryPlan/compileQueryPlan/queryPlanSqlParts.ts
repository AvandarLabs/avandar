import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
import type { QueryPlan } from "@/lib/agent/dataAgent/queryPlan/QueryPlan";

/** A dataset as the compiler sees it: its alias and columns. */
export type QueryPlanTable = {
  alias: string;
  columns: ReadonlyArray<{ name: string; dataType: string }>;
};

/** A measure after validation: real column name and a safe output name. */
export type ResolvedMeasure = {
  table: QueryPlanTable;
  column: string;
  name: string;
  aggregate: NonNullable<QueryPlan["measures"][number]["aggregate"]>;
};

/** A filter after validation, with its real column name. */
export type ResolvedFilter = { column: string; values: string[] };

const TEXT_TYPES = new Set(["varchar", "text", "string"]);
const DATE_TYPES = new Set(["date", "timestamp", "timestamp_s", "datetime"]);

const AGGREGATE_FUNCTIONS: Record<ResolvedMeasure["aggregate"], string> = {
  sum: "SUM",
  average: "AVG",
  max: "MAX",
  min: "MIN",
  count: "COUNT",
};

/** The column with this name in a table, matched ignoring case. */
export function findColumn(
  table: QueryPlanTable,
  name: string,
): string | undefined {
  const wanted = name.trim().toLowerCase();
  return table.columns.find((column) => {
    return column.name.toLowerCase() === wanted;
  })?.name;
}

/** A table's first date or timestamp column. */
export function findDateColumn(table: QueryPlanTable): string | undefined {
  return table.columns.find((column) => {
    return DATE_TYPES.has(column.dataType.toLowerCase());
  })?.name;
}

/** A table's text columns: together they name each place or thing. */
export function listTextColumns(table: QueryPlanTable): string[] {
  return table.columns
    .filter((column) => {
      return TEXT_TYPES.has(column.dataType.toLowerCase());
    })
    .map((column) => {
      return column.name;
    });
}

/** Quotes a list of column names for a SELECT or GROUP BY list. */
export function quoteColumns(columns: readonly string[]): string[] {
  return columns.map(quoteSqlIdentifier);
}

/** The time bucket expression for a date column. */
export function buildTimeBucket(
  dateColumn: string,
  timeGrain: QueryPlan["timeGrain"],
): string {
  const date = quoteSqlIdentifier(dateColumn);
  switch (timeGrain) {
    case "day":
      return `CAST(${date} AS DATE)`;
    case "week":
    case "month":
      return `CAST(date_trunc('${timeGrain}', ${date}) AS DATE)`;
    case "year":
      return `year(${date})`;
    default:
      return "";
  }
}

function _latestDate(table: QueryPlanTable, dateColumn: string): string {
  return `(SELECT max(${quoteSqlIdentifier(dateColumn)}) FROM ${quoteSqlIdentifier(table.alias)})`;
}

/**
 * Conditions that keep a plan's period. `target` is the expression to test
 * (a date column, or the `period` bucket after a running calculation) and
 * `table` and `dateColumn` give the data's own latest date.
 */
export function buildPeriodConditions(
  options: Readonly<{
    plan: Pick<QueryPlan, "relativePeriod">;
    from: string;
    to: string;
    target: string;
    table: QueryPlanTable;
    dateColumn: string;
  }>,
): string[] {
  const { target } = options;
  const latest = _latestDate(options.table, options.dateColumn);
  switch (options.plan.relativePeriod) {
    case "last_full_year":
      return [`year(${target}) = year(${latest}) - 1`];
    case "last_12_months":
      return [`${target} > ${latest} - INTERVAL 12 MONTH`];
    case "last_30_days":
      return [`${target} > ${latest} - INTERVAL 30 DAY`];
    case "latest_day":
      return [`${target} = ${latest}`];
    default:
      return [
        ...(options.from
          ? [`${target} >= ${quoteSqlLiteral(options.from)}`]
          : []),
        // A period ending on the data's last date includes it: models copy
        // the last date into `to`, which is exclusive.
        ...(options.to
          ? [
              `(${target} < ${quoteSqlLiteral(options.to)} OR DATE ${quoteSqlLiteral(options.to)} >= ${latest})`,
            ]
          : []),
      ];
  }
}

/** `"column" IN ('a', 'b')` for each filter. */
export function buildFilterConditions(
  filters: readonly ResolvedFilter[],
): string[] {
  return filters.map((filter) => {
    const values = filter.values.map(quoteSqlLiteral).join(", ");
    return `${quoteSqlIdentifier(filter.column)} IN (${values})`;
  });
}

/** `SUM("column") AS "name"` for one measure. */
export function buildMeasureSelect(measure: ResolvedMeasure): string {
  const fn = AGGREGATE_FUNCTIONS[measure.aggregate];
  return `${fn}(${quoteSqlIdentifier(measure.column)}) AS ${quoteSqlIdentifier(measure.name)}`;
}

/** A WHERE clause, or nothing when there are no conditions. */
export function buildWhere(conditions: readonly string[]): string {
  return conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
}
