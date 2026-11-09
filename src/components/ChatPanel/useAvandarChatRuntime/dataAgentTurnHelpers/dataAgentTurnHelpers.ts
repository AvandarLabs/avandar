import { where } from "@avandar/utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DataAgentDatasetCache } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/DataAgentDatasetCache";
import { getLastQuestionFromMessages } from "@/components/ChatPanel/useAvandarChatRuntime/getLastQuestionFromMessages/getLastQuestionFromMessages";
import {
  readAppliedSqlResult,
  waitForAppliedSqlOutcome,
} from "@/components/ChatPanel/useAvandarChatRuntime/waitForAppliedSqlOutcome/waitForAppliedSqlOutcome";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { createBrowserDataAgentHost } from "@/lib/agent/dataAgent/browser/createBrowserDataAgentHost";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatDashboardVizType } from "$/types/chat.types";
import type { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import type { DataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type {
  DataAgentHost,
  DataAgentQueryOutcome,
} from "@/lib/agent/dataAgent/DataAgentHost";
import type { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { useSqlToStructuredQuery } from "@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery";
import type { ChatModelRunResult } from "@assistant-ui/react";
import type { MutableRefObject } from "react";

/** The chat runtime pieces a data agent turn uses, online or offline. */
export type DataAgentTurnOptions = {
  apiMessages: readonly ChatClientMessage.T[];
  workspaceId: Workspace.Id;
  currentUser: User.T | undefined;
  /** Identifies the conversation; a new chat gets a new agent. */
  chatGeneration: number;
  parseSqlRef: MutableRefObject<
    ReturnType<typeof useSqlToStructuredQuery>["parseSql"]
  >;
  dataExplorerDispatch: ReturnType<typeof DataExplorerStateManager.useDispatch>;
  chatPanelDispatch: ReturnType<typeof ChatPanelStateManager.useDispatch>;
};

/** The query request the explorer host answers, as the agent sends it. */
type ShowQueryRequest = Readonly<{
  sql: string;
  summary: string;
  chart?: string;
  previewRowCount?: number;
}>;

function _getPreviewRows(
  read: ReturnType<typeof readAppliedSqlResult>,
  previewRowCount: number,
): ReadonlyArray<readonly unknown[]> {
  const columnNames = (read.result?.columns ?? []).map((column) => {
    return column.name;
  });
  return (read.result?.data ?? []).slice(0, previewRowCount).map((row) => {
    return columnNames.map((name) => {
      return row[name];
    });
  });
}

function _toQueryOutcome(
  outcome: Awaited<ReturnType<typeof waitForAppliedSqlOutcome>>,
  read: ReturnType<typeof readAppliedSqlResult>,
  previewRowCount: number | undefined,
): DataAgentQueryOutcome {
  if (outcome === "failed" || outcome === "unknown") {
    return {
      kind: "failed",
      error: read.errorMessage ?? "The query did not finish.",
    };
  }
  const columns = (read.result?.columns ?? []).map((column) => {
    return { name: column.name, type: String(column.dataType) };
  });
  return {
    kind: outcome,
    columns,
    rowCount: read.result?.numRows ?? 0,
    ...(previewRowCount !== undefined
      ? { previewRows: _getPreviewRows(read, previewRowCount) }
      : {}),
  };
}

/** Puts the agent's SQL into the Data Explorer, which runs and shows it. */
function _applySqlToExplorer(
  options: Readonly<DataAgentTurnOptions>,
  request: ShowQueryRequest,
): void {
  const { dataExplorerDispatch } = options;
  dataExplorerDispatch.setRawSql(request.sql);
  dataExplorerDispatch.setNlPrompt(
    getLastQuestionFromMessages(options.apiMessages),
  );
  try {
    const mapping = options.parseSqlRef.current({ sql: request.sql });
    dataExplorerDispatch.applySqlMapping(mapping);
  } catch {
    // The structured form stays out of sync; the SQL still runs.
  }
  if (request.chart) {
    dataExplorerDispatch.setActiveVizType(
      request.chart as ChatDashboardVizType,
    );
  }
}

/**
 * The host's `showQuery` for the Data Explorer: applies the SQL, waits for
 * the explorer's query to settle, and reports its shape, plus its first rows
 * when the request asks for `previewRowCount` of them.
 */
export function createExplorerShowQuery(
  options: Readonly<DataAgentTurnOptions>,
): (request: ShowQueryRequest) => Promise<DataAgentQueryOutcome> {
  return async (request) => {
    _applySqlToExplorer(options, request);
    const queryCache = AvaQueryClient.getQueryCache();
    const { workspaceId } = options;
    const outcome = await waitForAppliedSqlOutcome({
      queryCache,
      workspaceId,
      rawSql: request.sql,
    });
    return _toQueryOutcome(
      outcome,
      readAppliedSqlResult({ queryCache, workspaceId, rawSql: request.sql }),
      request.previewRowCount,
    );
  };
}

/** The browser host a data agent in the Data Explorer chat runs against. */
export function createExplorerDataAgentHost(
  options: Readonly<DataAgentTurnOptions>,
): DataAgentHost {
  return createBrowserDataAgentHost({
    workspaceId: options.workspaceId,
    userId: options.currentUser?.id,
    showQueryInExplorer: createExplorerShowQuery(options),
    showQuestionCard: (clarification) => {
      options.chatPanelDispatch.setPendingClarification(clarification);
    },
  });
}

async function _fetchDataAgentDatasets(
  workspaceId: Workspace.Id,
): Promise<DataAgentDataset[]> {
  const datasets = await DatasetClient.getAllDatasetsWithColumns(
    where("workspace_id", "eq", workspaceId),
  );
  return datasets.map((dataset) => {
    return {
      id: dataset.id,
      name: dataset.name,
      columns: dataset.columns.map((column) => {
        return { name: column.name, dataType: String(column.dataType) };
      }),
    };
  });
}

/**
 * The workspace's datasets and columns for the agent's prompt. Loaded from
 * the server when online and kept for this tab; offline, or when the server
 * cannot be reached, the kept copy answers instead.
 */
export async function loadDataAgentDatasets(
  workspaceId: Workspace.Id,
): Promise<DataAgentDataset[]> {
  const cached = DataAgentDatasetCache.read(workspaceId);
  if (!navigator.onLine && cached) {
    return cached;
  }
  try {
    const datasets = await _fetchDataAgentDatasets(workspaceId);
    DataAgentDatasetCache.write(workspaceId, datasets);
    return datasets;
  } catch (error) {
    if (cached) {
      return cached;
    }
    throw error;
  }
}

/**
 * The text the agent reads for this turn. A conversation the agent has not
 * seen (for example after a reload) starts with a short recap of the thread.
 */
function _buildPromptText(
  apiMessages: readonly ChatClientMessage.T[],
  isNewAgent: boolean,
): string {
  const latest = apiMessages.at(-1)?.content ?? "";
  if (!isNewAgent || apiMessages.length <= 1) {
    return latest;
  }
  const recap = apiMessages
    .slice(0, -1)
    .map((message) => {
      return `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`;
    })
    .join("\n");
  return `Earlier in this conversation:\n${recap}\n\n${latest}`;
}

/**
 * Asks this conversation's agent the turn's message, creating the agent on
 * the conversation's first turn, and returns its reply as chat content.
 * `agents` holds one agent per `${workspaceId}:${chatGeneration}`, so
 * follow-ups see earlier turns.
 */
export async function askConversationDataAgent(
  options: Readonly<{
    agents: Map<string, DataAgent>;
    turn: Readonly<DataAgentTurnOptions>;
    createAgent: () => Promise<DataAgent>;
  }>,
): Promise<ChatModelRunResult> {
  const { turn } = options;
  const key = `${turn.workspaceId}:${turn.chatGeneration}`;
  const existing = options.agents.get(key);
  const dataAgent = existing ?? (await options.createAgent());
  options.agents.set(key, dataAgent);
  turn.chatPanelDispatch.setPendingClarification(undefined);
  const reply = await dataAgent.ask(
    _buildPromptText(turn.apiMessages, !existing),
  );
  return { content: [{ type: "text", text: reply.text }] };
}
