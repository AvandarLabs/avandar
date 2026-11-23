import { quoteSqlIdentifier } from "@avandar/utils/sql";
import {
  buildFilterConditions,
  buildMeasureSelect,
  buildPeriodConditions,
  buildTimeBucket,
  buildWhere,
  findColumn,
  listTextColumns,
  quoteColumns,
} from "@/lib/agent/dataAgent/queryPlan/compileQueryPlan/queryPlanSqlParts";
import { resolveQueryPlan } from "@/lib/agent/dataAgent/queryPlan/compileQueryPlan/resolveQueryPlan";
import type { QueryPlanTable } from "@/lib/agent/dataAgent/queryPlan/compileQueryPlan/queryPlanSqlParts";
import type { ResolvedQueryPlan } from "@/lib/agent/dataAgent/queryPlan/compileQueryPlan/resolveQueryPlan";
import type { QueryPlan } from "@/lib/agent/dataAgent/queryPlan/QueryPlan";

export type { QueryPlanTable } from "@/lib/agent/dataAgent/queryPlan/compileQueryPlan/queryPlanSqlParts";

/** SQL over the dataset aliases, or what the model should fix. */
export type CompiledQueryPlan =
  | { kind: "sql"; sql: string }
  | { kind: "error"; message: string };

const PERIOD = quoteSqlIdentifier("period");

/** Running calculations need the whole series, so the period applies last. */
function _isRunning(resolved: ResolvedQueryPlan): boolean {
  return (
    resolved.plan.calculation === "rolling_7_day_average" ||
    resolved.plan.calculation === "running_total"
  );
}

function _keys(resolved: ResolvedQueryPlan): string[] {
  const groups = quoteColumns(resolved.groupBy);
  return resolved.timeGrain === "none" ? groups : [PERIOD, ...groups];
}

function _periodConditions(
  resolved: ResolvedQueryPlan,
  table: QueryPlanTable,
  target: string,
): string[] {
  const dateColumn = resolved.dateColumnByAlias.get(table.alias);
  if (!dateColumn) {
    return [];
  }
  return buildPeriodConditions({
    plan: resolved.plan,
    from: resolved.from,
    to: resolved.to,
    target,
    table,
    dateColumn,
  });
}

/** One CTE per dataset: its measures, grouped by period and groups. */
function _buildMeasureCte(
  resolved: ResolvedQueryPlan,
  table: QueryPlanTable,
  index: number,
): string {
  const dateColumn = resolved.dateColumnByAlias.get(table.alias) ?? "";
  const bucket =
    resolved.timeGrain === "none"
      ? []
      : [`${buildTimeBucket(dateColumn, resolved.timeGrain)} AS ${PERIOD}`];
  const measures = resolved.measures
    .filter((measure) => {
      return measure.table === table;
    })
    .map(buildMeasureSelect);
  const select = [...bucket, ...quoteColumns(resolved.groupBy), ...measures];
  const conditions = [
    ...buildFilterConditions(resolved.filtersByAlias.get(table.alias) ?? []),
    ...(_isRunning(resolved)
      ? []
      : _periodConditions(resolved, table, quoteSqlIdentifier(dateColumn))),
  ];
  const groupBy = select.length > measures.length ? " GROUP BY ALL" : "";
  return `m${index} AS (SELECT ${select.join(", ")} FROM ${quoteSqlIdentifier(table.alias)}${buildWhere(conditions)}${groupBy})`;
}

/** Lines the measure CTEs up on the period and group columns. */
function _buildJoined(resolved: ResolvedQueryPlan): string {
  const keys = _keys(resolved);
  const from = resolved.tables
    .map((_table, index) => {
      if (index === 0) {
        return "m0";
      }
      return keys.length > 0
        ? `FULL OUTER JOIN m${index} USING (${keys.join(", ")})`
        : `CROSS JOIN m${index}`;
    })
    .join(" ");
  const measures = resolved.measures.map((measure) => {
    return quoteSqlIdentifier(measure.name);
  });
  return `joined AS (SELECT ${[...keys, ...measures].join(", ")} FROM ${from})`;
}

/**
 * Population per group from a per-place attribute repeated on every row:
 * the largest value per place (every text column together names a place),
 * then the sum over the places in each group.
 */
function _buildPopulationCte(
  resolved: ResolvedQueryPlan,
  populationTable: QueryPlanTable,
  populationColumn: string,
): string {
  const groups = quoteColumns(resolved.groupBy);
  const placeColumns = quoteColumns(
    listTextColumns(populationTable).filter((column) => {
      return !resolved.groupBy.includes(column);
    }),
  );
  const filters = buildFilterConditions(
    resolved.filtersByAlias.get(populationTable.alias) ?? [],
  );
  const inner = `SELECT ${[...groups, ...placeColumns].join(", ")}${groups.length + placeColumns.length > 0 ? ", " : ""}MAX(${quoteSqlIdentifier(populationColumn)}) AS place_population FROM ${quoteSqlIdentifier(populationTable.alias)}${buildWhere(filters)} GROUP BY ALL`;
  return `population AS (SELECT ${[...groups, "SUM(place_population) AS population"].join(", ")} FROM (${inner}) GROUP BY ALL)`;
}

function _findPopulation(
  resolved: ResolvedQueryPlan,
  allTables: readonly QueryPlanTable[],
): { table: QueryPlanTable; column: string } | undefined {
  const wanted = resolved.plan.populationColumn.trim() || "population";
  for (const table of [...resolved.tables, ...allTables]) {
    const column = findColumn(table, wanted);
    const hasGroups = resolved.groupBy.every((group) => {
      return findColumn(table, group) !== undefined;
    });
    if (column && hasGroups) {
      return { table, column };
    }
  }
  return undefined;
}

/** The calculated column, and the name results are ranked by. */
function _buildCalculation(resolved: ResolvedQueryPlan): {
  columns: string[];
  rankColumn: string;
} {
  const [first, second] = resolved.measures.map((measure) => {
    return quoteSqlIdentifier(measure.name);
  });
  const groups = quoteColumns(resolved.groupBy);
  const partition =
    groups.length > 0 ? `PARTITION BY ${groups.join(", ")} ` : "";
  switch (resolved.plan.calculation) {
    case "per_person": {
      const name = quoteSqlIdentifier(
        `${resolved.measures[0]!.name}_per_person`,
      );
      return {
        columns: [`population`, `${first} / population AS ${name}`],
        rankColumn: name,
      };
    }
    case "ratio": {
      const name = quoteSqlIdentifier(
        `${resolved.measures[0]!.name}_per_${resolved.measures[1]!.name}`,
      );
      return {
        columns: [`${first} * 1.0 / NULLIF(${second}, 0) AS ${name}`],
        rankColumn: name,
      };
    }
    case "rolling_7_day_average":
    case "running_total": {
      const isAverage = resolved.plan.calculation === "rolling_7_day_average";
      const name = quoteSqlIdentifier(
        `${resolved.measures[0]!.name}_${isAverage ? "7_day_average" : "running_total"}`,
      );
      const window = isAverage
        ? `AVG(${first}) OVER (${partition}ORDER BY ${PERIOD} ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`
        : `SUM(${first}) OVER (${partition}ORDER BY ${PERIOD})`;
      return { columns: [`${window} AS ${name}`], rankColumn: name };
    }
    default:
      return { columns: [], rankColumn: first! };
  }
}

function _buildOrderAndLimit(
  resolved: ResolvedQueryPlan,
  rankColumn: string,
): string {
  const { order, limit } = resolved.plan;
  const keys = _keys(resolved);
  const orderBy =
    order === "highest"
      ? `${rankColumn} DESC NULLS LAST`
      : order === "lowest"
        ? `${rankColumn} ASC NULLS LAST`
        : keys.length > 0
          ? keys.join(", ")
          : "";
  const limitClause = limit > 0 ? ` LIMIT ${Math.floor(limit)}` : "";
  return `${orderBy ? ` ORDER BY ${orderBy}` : ""}${limitClause}`;
}

function _buildFinalSelect(
  resolved: ResolvedQueryPlan,
  hasPopulation: boolean,
): string {
  const { columns, rankColumn } = _buildCalculation(resolved);
  const groups = quoteColumns(resolved.groupBy);
  const join = hasPopulation
    ? groups.length > 0
      ? ` LEFT JOIN population USING (${groups.join(", ")})`
      : " CROSS JOIN population"
    : "";
  const calculated = `calculated AS (SELECT joined.*${columns
    .map((column) => {
      return `, ${column}`;
    })
    .join("")} FROM joined${join})`;
  const conditions = _isRunning(resolved)
    ? _periodConditions(resolved, resolved.tables[0]!, PERIOD)
    : [];
  const qualify =
    resolved.plan.onePerGroup && groups.length > 0
      ? ` QUALIFY ROW_NUMBER() OVER (PARTITION BY ${groups.join(", ")} ORDER BY ${rankColumn} ${resolved.plan.order === "lowest" ? "ASC" : "DESC"} NULLS LAST) = 1`
      : "";
  return `${calculated} SELECT * FROM calculated${buildWhere(conditions)}${qualify}${_buildOrderAndLimit(resolved, rankColumn)}`;
}

/**
 * Compiles a query plan into one DuckDB statement over the dataset aliases:
 * a CTE per dataset with its measures, a full outer join on the period and
 * groups, an optional population per group (largest value per place, then
 * summed), the calculation, and the order. Errors come back as instructions
 * the model can follow.
 */
export function compileQueryPlan(
  plan: QueryPlan,
  tables: readonly QueryPlanTable[],
): CompiledQueryPlan {
  const resolved = resolveQueryPlan(plan, tables);
  if (!resolved.ok) {
    return { kind: "error", message: resolved.message };
  }
  const ctes = resolved.value.tables.map((table, index) => {
    return _buildMeasureCte(resolved.value, table, index);
  });
  ctes.push(_buildJoined(resolved.value));
  if (plan.calculation === "per_person") {
    const population = _findPopulation(resolved.value, tables);
    if (!population) {
      return {
        kind: "error",
        message: `No dataset has a population column "${plan.populationColumn}" with the group columns. Set populationColumn to a column that holds population.`,
      };
    }
    ctes.push(
      _buildPopulationCte(resolved.value, population.table, population.column),
    );
  }
  const finalSelect = _buildFinalSelect(
    resolved.value,
    plan.calculation === "per_person",
  );
  return { kind: "sql", sql: `WITH ${ctes.join(", ")}, ${finalSelect}` };
}
