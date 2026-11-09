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
import { parseAgentPageRoute } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/parseAgentPageRoute";
import { createAgentConversation } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost";
import {
  askConversationDataAgent,
  buildConversationKey,
  loadDataAgentDatasets,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import { isPersonalDataText } from "@/components/privacy/privacy-helpers/detectPii/detectPii";
import { createDataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import { isPersonalColumnName } from "@/lib/agent/dataAgent/pagePrivacy/isPersonalColumnName";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  AgentConversationState,
  DataAgentConversation,
  DataAgentTurnOptions,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";
import type { DataAgentModelPolicy } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { SqlLiteralDetectors } from "@/lib/agent/dataAgent/pagePrivacy/findSensitiveSqlLiterals";
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

/**
 * What counts as personal in page SQL: values that go with a column whose
 * name looks personal or that is none of the datasets' columns (an alias
 * may stand for a personal one), and values that look personal on their
 * own.
 */
function _createPageSqlDetectors(
  datasets: readonly DataAgentDataset[],
): SqlLiteralDetectors {
  return {
    isSensitiveColumn: isPersonalColumnName,
    isSensitiveValue: isPersonalDataText,
    knownColumnNames: new Set(
      datasets.flatMap((dataset) => {
        return dataset.columns.map((column) => {
          return column.name.toLowerCase();
        });
      }),
    ),
  };
}

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

function _createConversation(
  turnRef: AgentConversationState["turnRef"],
  datasets: readonly DataAgentDataset[],
): DataAgentConversation {
  return createAgentConversation({
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
      });
    },
  });
}

/**
 * What is on screen for this turn. When reading the page fails, the route
 * still names the page, so results keep going where the user is looking.
 */
async function _readPageContext(
  page: Readonly<AgentPageInputs>,
  datasets: readonly DataAgentDataset[],
  workspaceId: Workspace.Id,
): Promise<AgentPageContext> {
  try {
    return await createAgentPageContext({
      ...page,
      datasets,
      loader: createAgentPageNameLoader(workspaceId),
    });
  } catch {
    return { app: parseAgentPageRoute(page.pathname).app };
  }
}

/**
 * Answers a chat message on any page with the Pi-based data agent. The
 * agent runs in the browser; only model requests go to the server, through
 * the agent proxy. The current page starts each turn's message. Personal
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
    ? await _readPageContext(page, datasets, options.workspaceId)
    : undefined;
  return askConversationDataAgent({
    conversations: conversationsByChat,
    turn: { ...options, pageContext },
    buildPageBlock: (conversation) => {
      const { sqlVault } = conversation;
      const detectors = _createPageSqlDetectors(datasets);
      return pageContext
        ? buildAgentPageContextBlock({
            context: pageContext,
            aliases: SqlTableAlias.fromSchema({ datasets }),
            isSensitive: isPersonalDataText,
            redactSql: (sql) => {
              return sqlVault.redact(sql, detectors);
            },
            maskText: sqlVault.maskText,
          })
        : undefined;
    },
    createConversation: async (turnRef) => {
      return _createConversation(turnRef, datasets);
    },
  });
}
