import { streamProxy } from "@earendil-works/pi-agent-core";
import { createModels } from "@earendil-works/pi-ai/models";
import { openrouterProvider } from "@earendil-works/pi-ai/providers/openrouter";
import { DATA_AGENT_MODEL_ROSTER } from "$/agent/DataAgentModelRoster";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { getLastQuestionFromMessages } from "@/components/ChatPanel/useAvandarChatRuntime/getLastQuestionFromMessages/getLastQuestionFromMessages";
import {
  readAppliedSqlResult,
  waitForAppliedSqlOutcome,
} from "@/components/ChatPanel/useAvandarChatRuntime/waitForAppliedSqlOutcome/waitForAppliedSqlOutcome";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { createBrowserDataAgentHost } from "@/lib/agent/dataAgent/browser/createBrowserDataAgentHost";
import { createDataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import { where } from "@avandar/utils";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatDashboardVizType } from "$/types/chat.types";
import type { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import type {
  DataAgent,
  DataAgentModelPolicy,
} from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { DataAgentQueryOutcome } from "@/lib/agent/dataAgent/DataAgentHost";
import type { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { useSqlToStructuredQuery } from "@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery";
import type { StreamFn } from "@earendil-works/pi-agent-core";
import type { ChatModelRunResult } from "@assistant-ui/react";
import type { MutableRefObject } from "react";

/** The chat runtime pieces a data agent turn uses. */
export type RunDataAgentTurnOptions = {
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

/** One agent per conversation, so follow-ups see earlier turns. */
const agentsByConversation = new Map<string, DataAgent>();

const models = createModels();
models.setProvider(openrouterProvider());

function _createModelPolicy(): DataAgentModelPolicy {
  const toChoice = (spec: {
    openRouterId: string;
    thinkingLevel: DataAgentModelPolicy["primary"]["thinkingLevel"];
  }) => {
    const model = models.getModel("openrouter", spec.openRouterId);
    if (!model) {
      throw new Error(`Unknown data agent model "${spec.openRouterId}"`);
    }
    return { model, thinkingLevel: spec.thinkingLevel };
  };
  return {
    primary: toChoice(DATA_AGENT_MODEL_ROSTER.primary),
    escalation: toChoice(DATA_AGENT_MODEL_ROSTER.escalation),
  };
}

/** Streams each model request through the `chat` edge function's proxy. */
function _createProxyStreamFn(workspaceId: Workspace.Id): StreamFn {
  return async (model, context, streamOptions) => {
    const { data } = await AvaSupabase.db().auth.getSession();
    return streamProxy(model, context, {
      ...streamOptions,
      authToken: data.session?.access_token ?? "",
      proxyUrl: `${AvaSupabase.getEdgeFunctionsURL()}/chat/${workspaceId}/agent`,
    });
  };
}

function _toQueryOutcome(
  outcome: Awaited<ReturnType<typeof waitForAppliedSqlOutcome>>,
  read: ReturnType<typeof readAppliedSqlResult>,
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
  return { kind: outcome, columns, rowCount: read.result?.numRows ?? 0 };
}

function _createShowQuery(options: Readonly<RunDataAgentTurnOptions>) {
  return async (
    request: Readonly<{ sql: string; summary: string; chart?: string }>,
  ): Promise<DataAgentQueryOutcome> => {
    const { dataExplorerDispatch, workspaceId } = options;
    dataExplorerDispatch.setRawSql(request.sql);
    dataExplorerDispatch.setNlPrompt(getLastQuestionFromMessages(options.apiMessages));
    try {
      const mapping = options.parseSqlRef.current({ sql: request.sql });
      dataExplorerDispatch.applySqlMapping(mapping);
    } catch {
      // The structured form stays out of sync; the SQL still runs.
    }
    if (request.chart) {
      dataExplorerDispatch.setActiveVizType(request.chart as ChatDashboardVizType);
    }
    const queryCache = AvaQueryClient.getQueryCache();
    const outcome = await waitForAppliedSqlOutcome({ queryCache, workspaceId, rawSql: request.sql });
    return _toQueryOutcome(outcome, readAppliedSqlResult({ queryCache, workspaceId, rawSql: request.sql }));
  };
}

async function _createAgent(
  options: Readonly<RunDataAgentTurnOptions>,
): Promise<DataAgent> {
  const datasets = await DatasetClient.getAllDatasetsWithColumns(
    where("workspace_id", "eq", options.workspaceId),
  );
  return createDataAgent({
    datasets: datasets.map((dataset) => {
      return {
        id: dataset.id,
        name: dataset.name,
        columns: dataset.columns.map((column) => {
          return { name: column.name, dataType: String(column.dataType) };
        }),
      };
    }),
    host: createBrowserDataAgentHost({
      workspaceId: options.workspaceId,
      userId: options.currentUser?.id,
      showQueryInExplorer: _createShowQuery(options),
      showQuestionCard: (clarification) => {
        options.chatPanelDispatch.setPendingClarification(clarification);
      },
    }),
    policy: _createModelPolicy(),
    streamFn: _createProxyStreamFn(options.workspaceId),
    today: new Date().toISOString().slice(0, 10),
    sessionId: crypto.randomUUID(),
  });
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
 * Answers a Data Explorer chat message with the Pi-based data agent instead
 * of the `chat` edge function's single-call harness. The agent runs in the
 * browser; only model requests go to the server, through the agent proxy.
 */
export async function runDataAgentTurn(
  options: Readonly<RunDataAgentTurnOptions>,
): Promise<ChatModelRunResult> {
  const key = `${options.workspaceId}:${options.chatGeneration}`;
  const existing = agentsByConversation.get(key);
  const dataAgent = existing ?? (await _createAgent(options));
  agentsByConversation.set(key, dataAgent);
  options.chatPanelDispatch.setPendingClarification(undefined);
  const reply = await dataAgent.ask(_buildPromptText(options.apiMessages, !existing));
  return { content: [{ type: "text", text: reply.text }] };
}
