import { streamProxy } from "@earendil-works/pi-agent-core";
import { createModels } from "@earendil-works/pi-ai/models";
import { openrouterProvider } from "@earendil-works/pi-ai/providers/openrouter";
import { DATA_AGENT_PROMPT_ID } from "$/agent/dataAgent/dataAgentTools";
import { DATA_AGENT_MODEL_ROSTER } from "$/agent/DataAgentModelRoster";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import {
  askConversationDataAgent,
  createExplorerDataAgentHost,
  loadDataAgentDatasets,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import { createDataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DataAgentTurnOptions } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import type {
  DataAgent,
  DataAgentModelPolicy,
} from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { ChatModelRunResult } from "@assistant-ui/react";
import type { StreamFn } from "@earendil-works/pi-agent-core";

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
      proxyUrl: `${AvaSupabase.getEdgeFunctionsURL()}/chat/${workspaceId}/agent/${DATA_AGENT_PROMPT_ID}`,
    });
  };
}

async function _createAgent(
  options: Readonly<DataAgentTurnOptions>,
): Promise<DataAgent> {
  return createDataAgent({
    datasets: await loadDataAgentDatasets(options.workspaceId),
    host: createExplorerDataAgentHost(options),
    policy: _createModelPolicy(),
    streamFn: _createProxyStreamFn(options.workspaceId),
    today: new Date().toISOString().slice(0, 10),
    sessionId: crypto.randomUUID(),
  });
}

/**
 * Answers a Data Explorer chat message with the Pi-based data agent instead
 * of the `chat` edge function's single-call harness. The agent runs in the
 * browser; only model requests go to the server, through the agent proxy.
 */
export async function runDataAgentTurn(
  options: Readonly<DataAgentTurnOptions>,
): Promise<ChatModelRunResult> {
  return askConversationDataAgent({
    agents: agentsByConversation,
    turn: options,
    createAgent: () => {
      return _createAgent(options);
    },
  });
}
