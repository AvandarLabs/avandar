import { obj, oneOf, opt, str } from "@earendil-works/pi-schema";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import { extractSingleQuotedSqlLiterals } from "@/components/privacy/privacy-helpers/generatedSqlAssumptions/generatedSqlAssumptions";
import { sanitizeQueryError } from "@/lib/agent/dataAgent/sanitizeQueryError/sanitizeQueryError";
import type {
  DataAgentHost,
  DataAgentQueryOutcome,
} from "@/lib/agent/dataAgent/DataAgentHost";
import type { DataAgentRunState } from "@/lib/agent/dataAgent/DataAgentRunState";
import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";

/** After this many runs in one answer, the last result stands. */
const MAX_QUERY_RUNS_PER_ANSWER = 3;

const RUN_QUERY_PARAMETERS = obj({
  sql: str({
    description: "One DuckDB SELECT or WITH statement over the aliases.",
  }),
  summary: str({
    description:
      "One or two plain sentences for the user: what the result shows, the dataset, and your choices.",
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

function _formatCell(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

/** The first rows as a small pipe table, for a model on the device. */
function _describePreview(
  columns: ReadonlyArray<{ name: string }>,
  rows: ReadonlyArray<readonly unknown[]>,
): string {
  const header = columns
    .map((column) => {
      return column.name;
    })
    .join(" | ");
  const lines = rows.map((row) => {
    return row.map(_formatCell).join(" | ");
  });
  return [header, ...lines].join("\n");
}

/**
 * What a model on the device reads after a query with rows: the first rows,
 * so it can check that they answer the question before it replies.
 */
function _describeRowsForCheck(
  outcome: Exclude<DataAgentQueryOutcome, { kind: "failed" }>,
): string {
  return `Shown to the user: ${_describeShape(outcome.columns, outcome.rowCount)}. First rows:
${_describePreview(outcome.columns, outcome.previewRows ?? [])}
If these rows answer the question, reply with the answer in one or two sentences. If they do not, fix the SQL and run it again.`;
}

/** What the model reads when a query failed or found nothing. */
function _describeProblem(outcome: DataAgentQueryOutcome): string {
  return outcome.kind === "failed"
    ? `The query failed (${sanitizeQueryError(outcome.error)}). Fix the SQL and run it again.`
    : "No rows matched. Check the filter values, joins, and period, then run a fixed query, or tell the user what you looked for.";
}

/**
 * What the model gets back after a query ran: the shape and an end to the
 * turn for rows, the first rows to check for a model on the device, or the
 * problem to fix.
 */
function _toToolResult(
  options: Readonly<{
    sql: string;
    outcome: DataAgentQueryOutcome;
    state: DataAgentRunState;
    previewRowCount?: number;
  }>,
): AgentToolResult<{ sql: string; outcome: string }> {
  const { sql, outcome, state } = options;
  const isLastRun = state.queryRuns >= MAX_QUERY_RUNS_PER_ANSWER;
  const details = { sql, outcome: outcome.kind };
  if (outcome.kind === "rows" && options.previewRowCount) {
    return {
      content: [{ type: "text", text: _describeRowsForCheck(outcome) }],
      details,
      terminate: isLastRun,
    };
  }
  if (outcome.kind === "rows") {
    const shape = _describeShape(outcome.columns, outcome.rowCount);
    return {
      content: [{ type: "text", text: `Shown to the user: ${shape}.` }],
      details,
      terminate: true,
    };
  }
  state.needsEscalation = true;
  return {
    content: [{ type: "text", text: _describeProblem(outcome) }],
    details,
    isError: outcome.kind === "failed",
    terminate: isLastRun,
  };
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
    /**
     * For a model on the user's device: rows it sees after each query, to
     * check the result before replying. The turn then does not end on rows.
     */
    previewRowCount?: number;
  }>,
): AgentTool<typeof RUN_QUERY_PARAMETERS> {
  return {
    name: "run_query",
    label: "Run query",
    description:
      "Runs the one DuckDB query that answers the question and shows its result to the user as a table or chart. Returns only the row count and column names. A result ends your turn.",
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
          content: [
            {
              type: "text",
              text: "The user declined the filter values in this query. Explain how to run it in the Data Explorer instead.",
            },
          ],
          details: { sql, outcome: "declined" },
        };
      }
      options.state.queryRuns += 1;
      const outcome = await options.host.showQuery({
        sql,
        summary: params.summary,
        chart: params.chart,
        previewRowCount: options.previewRowCount,
      });
      options.state.lastQuery = {
        sql,
        summary: params.summary,
        chart: params.chart,
        outcome,
      };
      return _toToolResult({
        sql,
        outcome,
        state: options.state,
        previewRowCount: options.previewRowCount,
      });
    },
  };
}
