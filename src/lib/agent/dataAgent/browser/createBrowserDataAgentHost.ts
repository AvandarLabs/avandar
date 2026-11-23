import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { decideIfDataCanCrossBoundary } from "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatClarifyRequest } from "$/types/chat.types";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";

/** What the browser host needs from the chat runtime and the page. */
export type BrowserDataAgentHostOptions = {
  workspaceId: Workspace.Id;
  userId: string | undefined;
  /**
   * Runs SQL and shows the result: in the Data Explorer or in the chat, as
   * the caller decides.
   */
  showQuery: DataAgentHost["showQuery"];
  /** Shows a question card in the chat panel. */
  showQuestionCard: (clarification: ChatClarifyRequest) => void;
};

async function _readColumnValues(
  workspaceId: Workspace.Id,
  sql: string,
): Promise<string[] | { error: string }> {
  try {
    const result = await WorkspaceQuerySession.runQuery<
      Record<string, unknown>
    >({
      rawSql: sql,
      workspaceId,
    });
    return result.data.flatMap((row) => {
      const value = Object.values(row)[0];
      return value === null || value === undefined ? [] : [String(value)];
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * The data agent's host in the app. Queries run where the caller's
 * `showQuery` sends them (DuckDB-Wasm, in the browser), lookups run locally
 * through the workspace query session, question cards appear in the chat
 * panel and are answered as the user's next message, and values pass the
 * privacy check before they reach the model.
 */
export function createBrowserDataAgentHost(
  options: Readonly<BrowserDataAgentHostOptions>,
): DataAgentHost {
  return {
    showQuery: options.showQuery,
    readColumnValues: (sql) => {
      return _readColumnValues(options.workspaceId, sql);
    },
    askUser: async (request) => {
      options.showQuestionCard({
        question: request.question,
        turnNumber: 1,
        responseShape: request.lookup
          ? {
              kind: "discovery",
              query: request.lookup.listQuery,
              column: request.lookup.column,
              multi: request.isMulti,
              candidateValues: [...request.lookup.candidateValues],
            }
          : {
              kind: "fixed_options",
              options: [...request.options],
              multi: request.isMulti,
            },
      });
      return { kind: "deferred" };
    },
    approveValuesForModel: async (request) => {
      if (request.values.length === 0 || !options.userId) {
        return request.values.length === 0;
      }
      const consent = await decideIfDataCanCrossBoundary({
        values: [...request.values],
        text: `data_agent:${request.reason}:${request.values.join("\u001f")}`,
        context: "discovery_clarification",
        workspaceId: options.workspaceId,
        userId: options.userId,
      });
      return consent.approved;
    },
  };
}
