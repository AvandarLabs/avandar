import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
import { runQueryForUser } from "@/lib/agent/dataAgent/createDataAgentTools/runQueryTool";
import { compileQueryPlan } from "@/lib/agent/dataAgent/queryPlan/compileQueryPlan/compileQueryPlan";
import { findColumn } from "@/lib/agent/dataAgent/queryPlan/compileQueryPlan/queryPlanSqlParts";
import { QUERY_PLAN_PARAMETERS } from "@/lib/agent/dataAgent/queryPlan/QueryPlan";
import type { DataAgentDataset } from "@/lib/agent/dataAgent/buildDataAgentSystemPrompt/buildDataAgentSystemPrompt";
import type { QueryToolContext } from "@/lib/agent/dataAgent/createDataAgentTools/runQueryTool";
import type { QueryPlanTable } from "@/lib/agent/dataAgent/queryPlan/compileQueryPlan/compileQueryPlan";
import type { QueryPlan } from "@/lib/agent/dataAgent/queryPlan/QueryPlan";
import type { AgentTool } from "@earendil-works/pi-agent-core";

function _toPlanTables(
  context: QueryToolContext,
  datasets: readonly DataAgentDataset[],
): PlanTableWithId[] {
  return context.aliases.flatMap((entry) => {
    const dataset = datasets.find((candidate) => {
      return entry.kind === "dataset" && candidate.id === entry.datasetId;
    });
    return dataset
      ? [
          {
            alias: entry.alias,
            columns: dataset.columns,
            datasetId: dataset.id,
          },
        ]
      : [];
  });
}

type PlanTableWithId = QueryPlanTable & { datasetId: string };

/** Values of one filter that one table does not hold. */
async function _findMissingValues(
  context: QueryToolContext,
  table: PlanTableWithId,
  filter: Readonly<{ column: string; values: readonly string[] }>,
): Promise<string[]> {
  const column = findColumn(table, filter.column);
  if (!column || filter.values.length === 0) {
    return [];
  }
  const found = await context.host.readColumnValues(
    `SELECT DISTINCT ${quoteSqlIdentifier(column)} FROM ${quoteSqlIdentifier(table.datasetId)} WHERE ${quoteSqlIdentifier(column)} IN (${filter.values.map(quoteSqlLiteral).join(", ")})`,
  );
  const stored = new Set(Array.isArray(found) ? found : []);
  return filter.values
    .filter((value) => {
      return !stored.has(value);
    })
    .map((value) => {
      return `"${value}" is not stored in ${table.alias}."${column}"`;
    });
}

/**
 * Checks every filter value against the data on the device before the
 * query runs. A small model otherwise filters on a value it made up ("All
 * states", "United States" for a stored "US") and gets an empty result with
 * no clue why.
 */
async function _checkFilterValues(
  context: QueryToolContext,
  tables: readonly PlanTableWithId[],
  plan: QueryPlan,
): Promise<string | undefined> {
  const measureTables = tables.filter((table) => {
    return plan.measures.some((measure) => {
      return measure.table.trim() === table.alias;
    });
  });
  const problems: string[] = [];
  for (const filter of plan.filters) {
    for (const table of measureTables) {
      problems.push(...(await _findMissingValues(context, table, filter)));
    }
  }
  return problems.length > 0
    ? `${problems.join("; ")}. Use values listed under VALUES IN THE QUESTION or DATASETS, spelled exactly, or drop the filter.`
    : undefined;
}

function _toPlanError(message: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: `The plan cannot run: ${message} Fix the plan and call plan_query again.`,
      },
    ],
    details: { sql: "", outcome: "invalid_plan" },
    isError: true,
  };
}

/**
 * The tool that answers a question from a query plan instead of SQL: the
 * model fills measures, filters, period, groups, calculation, and order,
 * and code writes the SQL. It runs through the same path as `run_query`, so
 * consent, caps, and the result handling are the same.
 */
export function createPlanQueryTool(
  context: QueryToolContext,
  datasets: readonly DataAgentDataset[],
): AgentTool<typeof QUERY_PLAN_PARAMETERS> {
  const tables = _toPlanTables(context, datasets);
  return {
    name: "plan_query",
    label: "Plan query",
    description:
      "Answers a data question from a plan: what to add up, which rows, which period, how to group, any calculation, and the order. Code writes and runs the SQL and shows the result to the user.",
    parameters: QUERY_PLAN_PARAMETERS,
    executionMode: "sequential",
    execute: async (_toolCallId, plan) => {
      const compiled = compileQueryPlan(plan, tables);
      if (compiled.kind === "error") {
        return _toPlanError(compiled.message);
      }
      const valueProblem = await _checkFilterValues(context, tables, plan);
      if (valueProblem) {
        return _toPlanError(valueProblem);
      }
      return runQueryForUser(context, {
        aliasSql: compiled.sql,
        summary: plan.summary,
        chart: plan.chart,
      });
    },
  };
}
