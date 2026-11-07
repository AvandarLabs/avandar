import { obj, oneOf, opt, str } from "@earendil-works/pi-schema";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import { sanitizeQueryError } from "@/lib/agent/dataAgent/sanitizeQueryError/sanitizeQueryError";
import { extractSingleQuotedSqlLiterals } from "@/components/privacy/privacy-helpers/generatedSqlAssumptions/generatedSqlAssumptions";
import type {
  DataAgentHost,
  DataAgentQueryOutcome,
} from "@/lib/agent/dataAgent/DataAgentHost";
import type { DataAgentRunState } from "@/lib/agent/dataAgent/DataAgentRunState";
import type { AgentTool } from "@earendil-works/pi-agent-core";

/** After this many runs in one answer, the last result stands. */
const MAX_QUERY_RUNS_PER_ANSWER = 3;

const RUN_QUERY_PARAMETERS = obj({
  sql: str({ description: "One DuckDB SELECT or WITH statement over the aliases." }),
  summary: str({
    description: "One or two plain sentences for the user: what the result shows, the dataset, and your choices.",
  }),
  chart: opt(
    oneOf(["bar", "line", "area", "scatter", "pie"], {
      description: "Only when the user asked for a chart, graph, or plot.",
    }),
  ),
});

function _describeShape(
  columns: ReadonlyArray<{ name: string }>,
  rowCount: number,
): string {
  const names = columns
    .map((column) => {
      return column.name;
    })
    .join(", ");
  return `${rowCount} rows; columns ${names}`;
}

/** What the model reads when a query failed or found nothing. */
function _describeProblem(outcome: DataAgentQueryOutcome): string {
  return outcome.kind === "failed"
    ? `The query failed (${sanitizeQueryError(outcome.error)}). Fix the SQL and run it again.`
    : "No rows matched. Check the filter values, joins, and period, then run a fixed query, or tell the user what you looked for.";
}

/**
 * The tool that runs a query for the user. The rows go to the user's screen;
 * the model gets only the row count and column names. A clean result ends the
 * turn, so a typical answer costs one model call. An error or an empty result
 * goes back to the model, with literals removed from the error, for one fix.
 */
export function createRunQueryTool(
  options: Readonly<{
    host: DataAgentHost;
    aliases: readonly SqlTableAlias.T[];
    state: DataAgentRunState;
  }>,
): AgentTool<typeof RUN_QUERY_PARAMETERS> {
  return {
    name: "run_query",
    label: "Run query",
    description:
      "Runs one DuckDB query and shows the result to the user as a table or chart. Returns only the row count and column names.",
    parameters: RUN_QUERY_PARAMETERS,
    executionMode: "sequential",
    execute: async (_toolCallId, params) => {
      const sql = SqlTableAlias.applyToSql(params.sql, options.aliases);
      const isApproved = await options.host.approveValuesForModel({
        values: extractSingleQuotedSqlLiterals(sql),
        reason: "query_filter",
      });
      if (!isApproved) {
        return {
          content: [{ type: "text", text: "The user declined the filter values in this query. Explain how to run it in the Data Explorer instead." }],
          details: { sql, outcome: "declined" },
        };
      }
      options.state.queryRuns += 1;
      const outcome = await options.host.showQuery({ sql, summary: params.summary, chart: params.chart });
      options.state.lastQuery = { sql, summary: params.summary, chart: params.chart, outcome };
      const isLastRun = options.state.queryRuns >= MAX_QUERY_RUNS_PER_ANSWER;
      if (outcome.kind === "rows") {
        return {
          content: [{ type: "text", text: `Shown to the user: ${_describeShape(outcome.columns, outcome.rowCount)}.` }],
          details: { sql, outcome: outcome.kind },
          terminate: true,
        };
      }
      options.state.needsEscalation = true;
      return {
        content: [{ type: "text", text: _describeProblem(outcome) }],
        details: { sql, outcome: outcome.kind },
        isError: outcome.kind === "failed",
        terminate: isLastRun,
      };
    },
  };
}
