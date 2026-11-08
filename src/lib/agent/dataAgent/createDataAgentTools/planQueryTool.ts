import { runQueryForUser } from "@/lib/agent/dataAgent/createDataAgentTools/runQueryTool";
import { compileQueryPlan } from "@/lib/agent/dataAgent/queryPlan/compileQueryPlan/compileQueryPlan";
import { QUERY_PLAN_PARAMETERS } from "@/lib/agent/dataAgent/queryPlan/QueryPlan";
import type { DataAgentDataset } from "@/lib/agent/dataAgent/buildDataAgentSystemPrompt/buildDataAgentSystemPrompt";
import type { QueryToolContext } from "@/lib/agent/dataAgent/createDataAgentTools/runQueryTool";
import type { QueryPlanTable } from "@/lib/agent/dataAgent/queryPlan/compileQueryPlan/compileQueryPlan";
import type { AgentTool } from "@earendil-works/pi-agent-core";

function _toPlanTables(
  context: QueryToolContext,
  datasets: readonly DataAgentDataset[],
): QueryPlanTable[] {
  return context.aliases.flatMap((entry) => {
    const dataset = datasets.find((candidate) => {
      return entry.kind === "dataset" && candidate.id === entry.datasetId;
    });
    return dataset ? [{ alias: entry.alias, columns: dataset.columns }] : [];
  });
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
        return {
          content: [
            {
              type: "text",
              text: `The plan cannot run: ${compiled.message} Fix the plan and call plan_query again.`,
            },
          ],
          details: { sql: "", outcome: "invalid_plan" },
          isError: true,
        };
      }
      return runQueryForUser(context, {
        aliasSql: compiled.sql,
        summary: plan.summary,
        chart: plan.chart,
      });
    },
  };
}
