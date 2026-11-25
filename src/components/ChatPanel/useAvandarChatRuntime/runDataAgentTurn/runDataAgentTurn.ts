import { streamProxy } from "@earendil-works/pi-agent-core";
import { createModels } from "@earendil-works/pi-ai/models";
import { openrouterProvider } from "@earendil-works/pi-ai/providers/openrouter";
import { i18n } from "@lingui/core";
import { DATA_AGENT_PROMPT_ID } from "$/agent/dataAgent/dataAgentTools";
import { DATA_AGENT_MODEL_ROSTER } from "$/agent/DataAgentModelRoster";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import {
  buildAgentTurnInputs,
  readAgentPageContext,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/buildAgentTurnInputs";
import { createAgentConversation } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost";
import {
  askConversationDataAgent,
  buildConversationKey,
  loadDataAgentDatasets,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import { createDataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AgentPageInputs } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/buildAgentTurnInputs";
import type {
  AgentConversationState,
  DataAgentConversation,
  DataAgentTurnOptions,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";
import type { DataAgentModelPolicy } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { RunPluginAiTool } from "@/lib/agent/dataAgent/createDataAgentTools/createPluginAiTool";
import type { ChatModelRunResult } from "@assistant-ui/react";
import type { StreamFn } from "@earendil-works/pi-agent-core";

/** The page state the adapter has when a turn starts. */
export type { AgentPageInputs };

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
 * Runs a plugin AI tool against what this conversation's turn has on
 * screen: the Data Explorer's result when the user is on it, else the last
 * chat result any turn of this conversation showed.
 */
async function _runConversationPluginAiTool(
  conversation: AgentConversationState,
  request: Parameters<RunPluginAiTool>[0],
): ReturnType<RunPluginAiTool> {
  const { runPluginAiTool } =
    await import("@/lib/plugins/runPluginAiTool/runPluginAiTool");
  const turn = conversation.turnRef.current;
  return runPluginAiTool({
    ...request,
    isDataExplorer: turn.pageContext?.app === "data-explorer",
    chatResults: conversation.resultsByTurn.flat(),
    runQuery: (sql) => {
      return WorkspaceQuerySession.runQuery({
        rawSql: sql,
        workspaceId: turn.workspaceId,
      });
    },
    invoke: async (context, args) => {
      // The handler caller reaches the plugin SDK and `makePluginApi`, so it
      // loads on first use to keep them out of the agent's chunk.
      const { invokePluginAiToolHandler } =
        await import("@/lib/plugins/invokePluginAiToolHandler/invokePluginAiToolHandler");
      return invokePluginAiToolHandler({
        declaration: request.declaration,
        context,
        args,
        workspace: {
          id: turn.workspaceId,
          slug: turn.workspaceSlug ?? "",
          locale: i18n.locale,
        },
      });
    },
  });
}

function _createConversation(
  turnRef: AgentConversationState["turnRef"],
  datasets: readonly DataAgentDataset[],
): DataAgentConversation {
  const conversation: DataAgentConversation = createAgentConversation({
    turnRef,
    datasets,
    createDataAgent: (host) => {
      return createDataAgent({
        datasets,
        host,
        policy: _createModelPolicy(),
        streamFn: _createProxyStreamFn(turnRef.current.workspaceId),
        today: new Date().toISOString().slice(0, 10),
        sessionId: crypto.randomUUID(),
        getPluginAiTools: turnRef.current.getPluginAiTools,
        runPluginAiTool: (request) => {
          return _runConversationPluginAiTool(conversation, request);
        },
      });
    },
  });
  return conversation;
}

/**
 * Answers a chat message on any page with the Pi-based data agent. The
 * agent runs in the browser; only model requests go to the server, through
 * the agent proxy. The current page, the attached gadgets, and what the
 * message's mentions refer to start each turn's message. Personal
 * values in its SQL become placeholders from the conversation's vault,
 * which the host maps back before the agent's SQL runs, and are masked in
 * the page's names and titles too. Datasets
 * load once per conversation: the agent's table aliases are positional, so
 * the page block must name tables from the same list the agent was given.
 */
export async function runDataAgentTurn(
  options: Readonly<DataAgentTurnOptions>,
  page?: Readonly<AgentPageInputs>,
): Promise<ChatModelRunResult> {
  const existing = conversationsByChat.get(buildConversationKey(options));
  const datasets =
    existing?.datasets ?? (await loadDataAgentDatasets(options.workspaceId));
  const pageContext = page
    ? await readAgentPageContext(page, datasets, options.workspaceId)
    : undefined;
  return askConversationDataAgent({
    conversations: conversationsByChat,
    turn: { ...options, pageContext },
    buildTurnInputs: (conversation) => {
      return buildAgentTurnInputs({
        conversation,
        datasets,
        pageContext,
        turn: options,
        privacy: "hosted",
      });
    },
    createConversation: async (turnRef) => {
      return _createConversation(turnRef, datasets);
    },
  });
}
