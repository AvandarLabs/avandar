import { streamProxy } from "@earendil-works/pi-agent-core";
import { createModels } from "@earendil-works/pi-ai/models";
import { openrouterProvider } from "@earendil-works/pi-ai/providers/openrouter";
import { DATA_AGENT_PROMPT_ID } from "$/agent/dataAgent/dataAgentTools";
import { DATA_AGENT_MODEL_ROSTER } from "$/agent/DataAgentModelRoster";
import { buildAgentPageContextBlock } from "$/agent/pageContext/buildAgentPageContextBlock";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import { createAgentPageNameLoader } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/agentPageNameLoader";
import { createAgentPageContext } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/createAgentPageContext";
import { createConversationAgentHost } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost";
import {
  askConversationDataAgent,
  loadDataAgentDatasets,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import { createDataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AgentConversationState } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost";
import type {
  DataAgentConversation,
  DataAgentTurnOptions,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import type { DataAgentModelPolicy } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { DashboardEditorAppState } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import type { ChatModelRunResult } from "@assistant-ui/react";
import type { StreamFn } from "@earendil-works/pi-agent-core";

/** The page state the adapter has when a turn starts. */
export type AgentPageInputs = {
  pathname: string;
  chatPageContext: ChatPageContext.T;
  dashboardEditorState: DashboardEditorAppState;
};

/** One conversation per chat, so follow-ups see earlier turns. */
const conversationsByChat = new Map<string, DataAgentConversation>();

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
      proxyUrl: `${AvaSupabase.getEdgeFunctionsURL()}/chat/${workspaceId}/agent/${DATA_AGENT_PROMPT_ID}`,
    });
  };
}

/**
 * The host must hold the same object the conversation map keeps, since
 * `askConversationDataAgent` updates its turn and results in place.
 */
async function _createConversation(
  turnRef: AgentConversationState["turnRef"],
  datasets: readonly DataAgentDataset[],
): Promise<DataAgentConversation> {
  const conversation = {
    turnRef,
    results: [],
  } as unknown as DataAgentConversation;
  conversation.dataAgent = createDataAgent({
    datasets,
    host: createConversationAgentHost(conversation),
    policy: _createModelPolicy(),
    streamFn: _createProxyStreamFn(turnRef.current.workspaceId),
    today: new Date().toISOString().slice(0, 10),
    sessionId: crypto.randomUUID(),
  });
  return conversation;
}

/**
 * Answers a chat message on any page with the Pi-based data agent. The
 * agent runs in the browser; only model requests go to the server, through
 * the agent proxy. The current page starts each turn's message.
 */
export async function runDataAgentTurn(
  options: Readonly<DataAgentTurnOptions>,
  page?: Readonly<AgentPageInputs>,
): Promise<ChatModelRunResult> {
  const datasets = await loadDataAgentDatasets(options.workspaceId);
  const pageContext = page
    ? await createAgentPageContext({
        ...page,
        datasets,
        loader: createAgentPageNameLoader(options.workspaceId),
      })
    : undefined;
  return askConversationDataAgent({
    conversations: conversationsByChat,
    turn: { ...options, pageContext },
    pageBlock: pageContext
      ? buildAgentPageContextBlock({
          context: pageContext,
          aliases: SqlTableAlias.fromSchema({ datasets }),
        })
      : undefined,
    createConversation: (turnRef) => {
      return _createConversation(turnRef, datasets);
    },
  });
}
