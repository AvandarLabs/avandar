import { streamProxy } from "@earendil-works/pi-agent-core";
import { createModels } from "@earendil-works/pi-ai/models";
import { openrouterProvider } from "@earendil-works/pi-ai/providers/openrouter";
import { DATA_AGENT_PROMPT_ID } from "$/agent/dataAgent/dataAgentTools";
import { DATA_AGENT_MODEL_ROSTER } from "$/agent/DataAgentModelRoster";
import {
  buildAgentContextBlocks,
  buildAgentGadgetModelName,
} from "$/agent/mentions/buildAgentContextBlocks";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
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
import { getLastQuestionFromMessages } from "@/components/ChatPanel/useAvandarChatRuntime/getLastQuestionFromMessages/getLastQuestionFromMessages";
import { isPersonalDataText } from "@/components/privacy/privacy-helpers/detectPii/detectPii";
import { createDataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import { isPersonalColumnName } from "@/lib/agent/dataAgent/pagePrivacy/isPersonalColumnName";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext";
import type { AgentContextBlocks } from "$/agent/mentions/buildAgentContextBlocks";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  AgentConversationState,
  AgentTurnGadgetContext,
  DataAgentConversation,
  DataAgentTurnOptions,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";
import type { AgentTurnInputs } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
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

/** A ref's loaded context, or `unavailable` when it was not loaded. */
function _contextOf(
  gadgetContext: AgentTurnGadgetContext | undefined,
  ref: Gadget.Ref,
): AgentGadgetContext {
  return (
    gadgetContext?.contexts?.get(ChatMentionToken.buildRefKey(ref)) ?? {
      kind: "unavailable",
      ref,
    }
  );
}

type TurnInputsOptions = {
  conversation: DataAgentConversation;
  datasets: readonly DataAgentDataset[];
  pageContext: AgentPageContext | undefined;
  turn: Readonly<DataAgentTurnOptions>;
};

/** The SQL a gadget's charts filter with, empty strings left out. */
function _gadgetSql(context: AgentGadgetContext | undefined): string[] {
  switch (context?.kind) {
    case "dashboard":
      return context.tiles
        .map((tile) => {
          return tile.sql;
        })
        .filter(Boolean);
    case "dashboard_tile":
      return [context.tile.sql].filter(Boolean);
    default:
      return [];
  }
}

/**
 * Redacts the SQL of gadgets only earlier user messages mention. No block
 * shows it, but the recap names those gadgets, so the vault must hold the
 * values it filters on before any name is masked.
 */
function _redactEarlierMentionSql(
  turn: Readonly<DataAgentTurnOptions>,
  question: string,
  redactSql: (sql: string) => void,
): void {
  const contexts = turn.gadgetContext?.contexts;
  const questionKeys = new Set(
    ChatMentionToken.refsFromText(question).map(ChatMentionToken.buildRefKey),
  );
  turn.apiMessages
    .flatMap((message) => {
      return message.role === "user"
        ? ChatMentionToken.refsFromText(message.content)
        : [];
    })
    .map(ChatMentionToken.buildRefKey)
    .filter((key) => {
      return !questionKeys.has(key);
    })
    .forEach((key) => {
      _gadgetSql(contexts?.get(key)).forEach(redactSql);
    });
}

/**
 * The page, attached, and mentioned blocks in one redaction pass through
 * the conversation's vault. Mentions come from the message being answered.
 * Nothing is attached or mentioned when the gadgets failed to load. The SQL
 * of gadgets earlier messages mention is redacted first, so their recap
 * names are masked too.
 */
function _buildBlocks(
  options: Readonly<TurnInputsOptions>,
): AgentContextBlocks {
  const { gadgetContext } = options.turn;
  const { sqlVault } = options.conversation;
  const detectors = _createPageSqlDetectors(options.datasets);
  const isLoaded = gadgetContext?.contexts !== undefined;
  // The raw question, which still holds the ref tokens.
  const question = getLastQuestionFromMessages(options.turn.apiMessages);
  const toContext = (ref: Gadget.Ref): AgentGadgetContext => {
    return _contextOf(gadgetContext, ref);
  };
  const redactSql = (sql: string): string => {
    return sqlVault.redact(sql, detectors);
  };
  // Every redaction happens before `buildAgentContextBlocks` masks a name.
  _redactEarlierMentionSql(options.turn, question, redactSql);
  return buildAgentContextBlocks({
    page: options.pageContext,
    attached: isLoaded ? gadgetContext.attachedRefs.map(toContext) : [],
    mentioned: isLoaded
      ? ChatMentionToken.refsFromText(question).map(toContext)
      : [],
    aliases: SqlTableAlias.fromSchema({ datasets: options.datasets }),
    isSensitive: isPersonalDataText,
    redactSql,
    maskText: sqlVault.maskText,
  });
}

/**
 * The turn's blocks, and the mention names masked with the same vault
 * after every block's SQL is redacted. When the gadgets failed to load,
 * a non-empty tray's attached block repeats last turn's, so the model reads
 * "unchanged", and every mention is named as unavailable.
 */
function _buildTurnInputs(
  options: Readonly<TurnInputsOptions>,
): AgentTurnInputs {
  const { conversation } = options;
  const { gadgetContext } = options.turn;
  const blocks = _buildBlocks(options);
  // A failed load with a tray repeats last turn's tray. With an empty tray
  // the attached block stays empty, so the model hears it was cleared.
  const isTrayUnknown =
    gadgetContext !== undefined &&
    !gadgetContext.contexts &&
    gadgetContext.attachedRefs.length > 0;
  return {
    blocks: isTrayUnknown
      ? { ...blocks, attachedBlock: conversation.lastAttachedBlock }
      : blocks,
    nameOf: (ref) => {
      return buildAgentGadgetModelName(_contextOf(gadgetContext, ref), {
        isSensitive: isPersonalDataText,
        mask: conversation.sqlVault.maskText,
      });
    },
  };
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
    ? await _readPageContext(page, datasets, options.workspaceId)
    : undefined;
  return askConversationDataAgent({
    conversations: conversationsByChat,
    turn: { ...options, pageContext },
    buildTurnInputs: (conversation) => {
      return _buildTurnInputs({
        conversation,
        datasets,
        pageContext,
        turn: options,
      });
    },
    createConversation: async (turnRef) => {
      return _createConversation(turnRef, datasets);
    },
  });
}
