import {
  findColumn,
  findDateColumn,
} from "@/lib/agent/dataAgent/queryPlan/compileQueryPlan/queryPlanSqlParts";
import type {
  QueryPlanTable,
  ResolvedFilter,
  ResolvedMeasure,
} from "@/lib/agent/dataAgent/queryPlan/compileQueryPlan/queryPlanSqlParts";
import type { QueryPlan } from "@/lib/agent/dataAgent/queryPlan/QueryPlan";

/** At most this many measures, so a result stays readable. */
const MAX_MEASURES = 3;

/** A plan with every name checked against the datasets. */
export type ResolvedQueryPlan = {
  plan: QueryPlan;
  measures: ResolvedMeasure[];
  /** Measure tables in first-use order; the first holds the dates. */
  tables: QueryPlanTable[];
  /** Filters, by table alias, on the columns each table has. */
  filtersByAlias: Map<string, ResolvedFilter[]>;
  groupBy: string[];
  dateColumnByAlias: Map<string, string>;
  timeGrain: QueryPlan["timeGrain"];
  from: string;
  to: string;
};

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

const NUMBER_TYPES = new Set([
  "tinyint",
  "smallint",
  "integer",
  "int",
  "bigint",
  "hugeint",
  "double",
  "float",
  "real",
  "decimal",
  "number",
]);

function _isNumberColumn(table: QueryPlanTable, name: string): boolean {
  const column = table.columns.find((candidate) => {
    return candidate.name === name;
  });
  const type = (column?.dataType ?? "").toLowerCase().replace(/\(.*$/, "");
  return NUMBER_TYPES.has(type);
}

/** Explains why a measure column cannot be added up, or nothing. */
function _checkMeasureType(
  table: QueryPlanTable,
  column: string,
  aggregate: string,
): string | undefined {
  if (aggregate === "count" || _isNumberColumn(table, column)) {
    return undefined;
  }
  const numberColumns = table.columns
    .filter((candidate) => {
      return _isNumberColumn(table, candidate.name);
    })
    .map((candidate) => {
      return candidate.name;
    });
  return `${table.alias}."${column}" is not a number column, so it cannot be added up. Number columns in ${table.alias}: ${numberColumns.join(", ")}.`;
}

function _columnNames(table: QueryPlanTable): string {
  return table.columns
    .map((column) => {
      return column.name;
    })
    .join(", ");
}

/** Turns "2021" or "2021-03" into a date; `isEnd` moves to the next one. */
export function normalizePlanDate(text: string, isEnd: boolean): string {
  const trimmed = text.trim();
  const year = /^(\d{4})$/.exec(trimmed);
  if (year) {
    return `${Number(year[1]) + (isEnd ? 1 : 0)}-01-01`;
  }
  const month = /^(\d{4})-(\d{2})$/.exec(trimmed);
  if (month) {
    const date = new Date(Date.UTC(Number(month[1]), Number(month[2]) - 1, 1));
    if (isEnd) {
      date.setUTCMonth(date.getUTCMonth() + 1);
    }
    return date.toISOString().slice(0, 10);
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

/** A safe, unique output column name for a measure. */
function _buildMeasureName(
  requested: string,
  column: string,
  table: QueryPlanTable,
  usedNames: Set<string>,
): string {
  let name = requested.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  name = name.replace(/^_+|_+$/g, "") || column.toLowerCase();
  while (usedNames.has(name)) {
    name = `${name}_${table.alias}`;
  }
  usedNames.add(name);
  return name;
}

function _resolveMeasures(
  plan: QueryPlan,
  tables: readonly QueryPlanTable[],
): Result<ResolvedMeasure[]> {
  if (plan.measures.length === 0 || plan.measures.length > MAX_MEASURES) {
    return { ok: false, message: "Give 1 to 3 measures." };
  }
  const usedNames = new Set<string>();
  const measures: ResolvedMeasure[] = [];
  for (const measure of plan.measures) {
    const table = tables.find((candidate) => {
      return candidate.alias === measure.table.trim();
    });
    if (!table) {
      return { ok: false, message: `There is no dataset "${measure.table}".` };
    }
    const column = findColumn(table, measure.column);
    if (!column) {
      return {
        ok: false,
        message: `${table.alias} has no column "${measure.column}". Its columns: ${_columnNames(table)}.`,
      };
    }
    const typeProblem = _checkMeasureType(
      table,
      column,
      measure.aggregate ?? "sum",
    );
    if (typeProblem) {
      return { ok: false, message: typeProblem };
    }
    const name = _buildMeasureName(measure.name, column, table, usedNames);
    measures.push({
      table,
      column,
      name,
      aggregate: measure.aggregate ?? "sum",
    });
  }
  return { ok: true, value: measures };
}

function _resolveFilters(
  plan: QueryPlan,
  tables: readonly QueryPlanTable[],
): Result<Map<string, ResolvedFilter[]>> {
  const filtersByAlias = new Map<string, ResolvedFilter[]>();
  for (const filter of plan.filters) {
    if (filter.values.length === 0) {
      continue;
    }
    const matches = tables.flatMap((table) => {
      const column = findColumn(table, filter.column);
      return column ? [{ table, column }] : [];
    });
    if (matches.length === 0) {
      return {
        ok: false,
        message: `No measure's dataset has the filter column "${filter.column}". Use a column of ${tables[0]?.alias}: ${_columnNames(tables[0]!)}.`,
      };
    }
    for (const { table, column } of matches) {
      // Two filters on one column mean "either": merged, not ANDed into
      // a filter nothing can pass.
      const list = filtersByAlias.get(table.alias) ?? [];
      const existing = list.find((entry) => {
        return entry.column === column;
      });
      if (existing) {
        existing.values = [...new Set([...existing.values, ...filter.values])];
      } else {
        list.push({ column, values: filter.values });
      }
      filtersByAlias.set(table.alias, list);
    }
  }
  return { ok: true, value: filtersByAlias };
}

function _resolveGroupBy(
  plan: QueryPlan,
  tables: readonly QueryPlanTable[],
): Result<string[]> {
  const groupBy: string[] = [];
  for (const name of plan.groupBy) {
    const columns = tables.map((table) => {
      return findColumn(table, name);
    });
    if (
      columns.some((column) => {
        return !column;
      })
    ) {
      return {
        ok: false,
        message: `Every measure's dataset must have the group column "${name}" to line results up.`,
      };
    }
    groupBy.push(columns[0]!);
  }
  return { ok: true, value: [...new Set(groupBy)] };
}

function _resolveDates(
  tables: readonly QueryPlanTable[],
  needsDates: boolean,
): Result<Map<string, string>> {
  const dateColumnByAlias = new Map<string, string>();
  for (const table of tables) {
    const dateColumn = findDateColumn(table);
    if (dateColumn) {
      dateColumnByAlias.set(table.alias, dateColumn);
    } else if (needsDates) {
      return { ok: false, message: `${table.alias} has no date column.` };
    }
  }
  return { ok: true, value: dateColumnByAlias };
}

function _needsSeries(plan: QueryPlan): boolean {
  return (
    plan.calculation === "rolling_7_day_average" ||
    plan.calculation === "running_total"
  );
}

/** The plan's time bucket and explicit dates, and whether it needs dates. */
function _resolvePeriod(plan: QueryPlan): {
  timeGrain: QueryPlan["timeGrain"];
  from: string;
  to: string;
  needsDates: boolean;
} {
  const timeGrain =
    plan.timeGrain === "none" && _needsSeries(plan) ? "day" : plan.timeGrain;
  const isExplicit = plan.relativePeriod === "none";
  const from = isExplicit ? normalizePlanDate(plan.from, false) : "";
  const to = isExplicit ? normalizePlanDate(plan.to, true) : "";
  const needsDates =
    timeGrain !== "none" || !isExplicit || from !== "" || to !== "";
  return { timeGrain, from, to, needsDates };
}

/**
 * Checks a plan against the datasets and resolves every name to a real
 * column, or explains what to fix in words a small model can act on.
 */
export function resolveQueryPlan(
  plan: QueryPlan,
  allTables: readonly QueryPlanTable[],
): Result<ResolvedQueryPlan> {
  const measures = _resolveMeasures(plan, allTables);
  if (!measures.ok) {
    return measures;
  }
  const tables = [
    ...new Set(
      measures.value.map((measure) => {
        return measure.table;
      }),
    ),
  ];
  const period = _resolvePeriod(plan);
  const filters = _resolveFilters(plan, tables);
  const groupBy = _resolveGroupBy(plan, tables);
  const dates = _resolveDates(tables, period.needsDates);
  if (!filters.ok || !groupBy.ok || !dates.ok) {
    return [filters, groupBy, dates].find((step) => {
      return !step.ok;
    }) as { ok: false; message: string };
  }
  if (plan.calculation === "ratio" && measures.value.length < 2) {
    return { ok: false, message: "A ratio needs two measures." };
  }
  return {
    ok: true,
    value: {
      plan,
      measures: measures.value,
      tables,
      filtersByAlias: filters.value,
      groupBy: groupBy.value,
      dateColumnByAlias: dates.value,
      timeGrain: period.timeGrain,
      from: period.from,
      to: period.to,
    },
  };
}
