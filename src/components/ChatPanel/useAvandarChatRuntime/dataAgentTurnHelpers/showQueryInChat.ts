import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type {
  DataAgentHost,
  DataAgentQueryOutcome,
} from "@/lib/agent/dataAgent/DataAgentHost";

/** Whether there are rows and every one holds only blanks. */
function _isAllBlank(rows: ReadonlyArray<Record<string, unknown>>): boolean {
  return (
    rows.length > 0 &&
    rows.every((row) => {
      return Object.values(row).every((cell) => {
        return cell === null || cell === undefined;
      });
    })
  );
}

/** The first rows, in column order, for an agent that asked for a preview. */
function _getPreviewRows(
  result: QueryResult.T,
  previewRowCount: number,
): ReadonlyArray<readonly unknown[]> {
  return result.data.slice(0, previewRowCount).map((row) => {
    return result.columns.map((column) => {
      return row[column.name];
    });
  });
}

function _toQueryOutcome(
  result: QueryResult.T,
  isEmpty: boolean,
  previewRowCount: number | undefined,
): DataAgentQueryOutcome {
  return {
    kind: isEmpty ? "empty" : "rows",
    columns: result.columns.map((column) => {
      return { name: column.name, type: String(column.dataType) };
    }),
    rowCount: result.numRows,
    ...(previewRowCount !== undefined
      ? { previewRows: _getPreviewRows(result, previewRowCount) }
      : {}),
  };
}

/**
 * Runs the agent's query for a page other than the Data Explorer: through
 * the workspace query session (the fail-closed analyzer, then DuckDB-Wasm),
 * adding a chat result when it has rows and a title (the question, or the
 * query's summary when the question is blank). The agent gets the result's
 * shape, plus its first rows only when the request asks for
 * `previewRowCount` of them. A result whose cells are all empty counts as
 * empty, as in the explorer.
 */
export async function showQueryInChat(
  options: Readonly<{
    workspaceId: Workspace.Id;
    title: string;
    results: AgentQueryResultData[];
    request: Parameters<DataAgentHost["showQuery"]>[0];
  }>,
): Promise<DataAgentQueryOutcome> {
  const { request } = options;
  try {
    const result = await WorkspaceQuerySession.runQuery({
      rawSql: request.sql,
      workspaceId: options.workspaceId,
    });
    const isEmpty = result.numRows === 0 || _isAllBlank(result.data);
    // A stored result needs a title to be shown, so a blank question falls
    // back to the agent's summary of the query.
    const title = options.title.trim() || request.summary.trim();
    if (!isEmpty && title) {
      options.results.push(
        AgentQueryResult.create({
          sql: request.sql,
          chart: request.chart,
          title,
        }),
      );
    }
    return _toQueryOutcome(result, isEmpty, request.previewRowCount);
  } catch (error) {
    return {
      kind: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
