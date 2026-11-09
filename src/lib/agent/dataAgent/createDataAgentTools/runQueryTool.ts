import { RUN_QUERY_TOOL } from "$/agent/dataAgent/dataAgentTools";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import { extractSingleQuotedSqlLiterals } from "@/components/privacy/privacy-helpers/generatedSqlAssumptions/generatedSqlAssumptions";
import { sanitizeQueryError } from "@/lib/agent/dataAgent/sanitizeQueryError/sanitizeQueryError";
import { isSchemaAnswerTurn } from "@/lib/agent/schemaAnswer/isSchemaAnswerTurn";
import type {
  DataAgentHost,
  DataAgentQueryOutcome,
} from "@/lib/agent/dataAgent/DataAgentHost";
import type { DataAgentRunState } from "@/lib/agent/dataAgent/DataAgentRunState";
import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";

/** After this many runs in one answer, the last result stands. */
const MAX_QUERY_RUNS_PER_ANSWER = 3;

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

/** What a query tool needs from the agent. */
export type QueryToolContext = Readonly<{
  host: DataAgentHost;
  aliases: readonly SqlTableAlias.T[];
  state: DataAgentRunState;
  /**
   * For a model on the user's device: rows it sees after each query, to
   * check the result before replying. The turn then does not end on rows.
   */
  previewRowCount?: number;
}>;

/** What the model reads when the question is about columns, not rows. */
function _schemaAnswerResult(
  sql: string,
): AgentToolResult<{ sql: string; outcome: string }> {
  return {
    content: [
      {
        type: "text",
        text: "The columns are already listed under DATASETS. Answer in plain text. Do not run a query: nothing should appear in the Data Explorer for this question.",
      },
    ],
    details: { sql, outcome: "schema" },
  };
}

/**
 * Runs SQL written over the dataset aliases for the user: asks consent for
 * the filter values when they call for it, shows the result, records it,
 * and returns what the model should read next. Every query tool ends here.
 * A question about columns is answered from the schema instead, and the
 * explorer is left unchanged.
 */
export async function runQueryForUser(
  context: QueryToolContext,
  request: Readonly<{ aliasSql: string; summary: string; chart?: string }>,
): Promise<AgentToolResult<{ sql: string; outcome: string }>> {
  if (isSchemaAnswerTurn(context.state.userTexts)) {
    return _schemaAnswerResult(request.aliasSql);
  }
  const sql = SqlTableAlias.applyToSql(request.aliasSql, context.aliases);
  const isApproved = await context.host.approveValuesForModel({
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
  context.state.queryRuns += 1;
  const { summary, chart } = request;
  const outcome = await context.host.showQuery({
    sql,
    summary,
    chart,
    previewRowCount: context.previewRowCount,
  });
  context.state.lastQuery = { sql, summary, chart, outcome };
  return _toToolResult({
    sql,
    outcome,
    state: context.state,
    previewRowCount: context.previewRowCount,
  });
}

/**
 * The tool that runs a query for the user. The rows go to the user's screen;
 * the model gets only the row count and column names. A clean result ends the
 * turn, so a typical answer costs one model call. An error or an empty result
 * goes back to the model, with literals removed from the error, for one fix.
 */
export function createRunQueryTool(
  options: QueryToolContext,
): AgentTool<typeof RUN_QUERY_TOOL.parameters> {
  return {
    ...RUN_QUERY_TOOL,
    executionMode: "sequential",
    execute: async (_toolCallId, params) => {
      return runQueryForUser(options, {
        aliasSql: params.sql,
        summary: params.summary,
        chart: params.chart,
      });
    },
  };
}
