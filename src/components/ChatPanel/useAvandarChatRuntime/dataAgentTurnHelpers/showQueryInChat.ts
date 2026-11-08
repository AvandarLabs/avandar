import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { DataAgentQueryOutcome } from "@/lib/agent/dataAgent/DataAgentHost";

function _isAllBlank(rows: ReadonlyArray<Record<string, unknown>>): boolean {
  return rows.every((row) => {
    return Object.values(row).every((cell) => {
      return cell === null || cell === undefined;
    });
  });
}

/**
 * Runs the agent's query for a page other than the Data Explorer: through
 * the workspace query session (the fail-closed analyzer, then DuckDB-Wasm),
 * adding a chat result when it has rows. The agent gets the result's shape
 * only. A result whose cells are all empty counts as empty, as in the
 * explorer.
 */
export async function showQueryInChat(
  options: Readonly<{
    workspaceId: Workspace.Id;
    title: string;
    results: AgentQueryResultData[];
    request: Readonly<{ sql: string; summary: string; chart?: string }>;
  }>,
): Promise<DataAgentQueryOutcome> {
  const { request } = options;
  try {
    const result = await WorkspaceQuerySession.runQuery({
      rawSql: request.sql,
      workspaceId: options.workspaceId,
    });
    const isEmpty = result.numRows === 0 || _isAllBlank(result.data);
    if (!isEmpty) {
      options.results.push(
        AgentQueryResult.create({
          sql: request.sql,
          chart: request.chart,
          title: options.title,
        }),
      );
    }
    return {
      kind: isEmpty ? "empty" : "rows",
      columns: result.columns.map((column) => {
        return { name: column.name, type: String(column.dataType) };
      }),
      rowCount: result.numRows,
    };
  } catch (error) {
    return {
      kind: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
