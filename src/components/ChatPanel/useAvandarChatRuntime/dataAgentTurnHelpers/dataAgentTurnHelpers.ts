import { where } from "@avandar/utils";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { buildAgentTurnText } from "$/agent/pageContext/buildAgentTurnText";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import { buildLocalGadgetName } from "@/components/ChatPanel/useAvandarChatRuntime/agentMentions/loadTurnGadgetContext";
import { DataAgentDatasetCache } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/DataAgentDatasetCache";
import { getLastQuestionFromMessages } from "@/components/ChatPanel/useAvandarChatRuntime/getLastQuestionFromMessages/getLastQuestionFromMessages";
import {
  readAppliedSqlResult,
  waitForAppliedSqlOutcome,
} from "@/components/ChatPanel/useAvandarChatRuntime/waitForAppliedSqlOutcome/waitForAppliedSqlOutcome";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { AgentContextBlocks } from "$/agent/mentions/buildAgentContextBlocks";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatDashboardVizType } from "$/types/chat.types";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type {
  AgentConversationState,
  DataAgentConversation,
  DataAgentTurnOptions,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";
import type { DataAgentQueryOutcome } from "@/lib/agent/dataAgent/DataAgentHost";
import type { ChatModelRunResult } from "@assistant-ui/react";

/** Re-exported for the chat model adapter, which builds each turn's options. */
export type { DataAgentTurnOptions } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";

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
    getLastQuestionFromMessages(
      options.apiMessages,
      buildLocalGadgetName(options.gadgetContext),
    ),
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
  apiMessages: ReadonlyArray<Pick<ChatClientMessage.T, "role" | "content">>,
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

/** The map key of a turn's conversation: one per workspace and chat. */
export function buildConversationKey(
  turn: Readonly<Pick<DataAgentTurnOptions, "workspaceId" | "chatGeneration">>,
): string {
  return `${turn.workspaceId}:${turn.chatGeneration}`;
}

/**
 * Drops the workspace's other chats, stopping any run still in progress: a
 * new chat replaces the old one.
 */
function _dropOtherChats(
  conversations: Map<string, DataAgentConversation>,
  turn: Readonly<DataAgentTurnOptions>,
): void {
  const key = buildConversationKey(turn);
  [...conversations.keys()].forEach((otherKey) => {
    if (otherKey !== key && otherKey.startsWith(`${turn.workspaceId}:`)) {
      conversations.get(otherKey)?.dataAgent.agent.abort();
      conversations.delete(otherKey);
    }
  });
}

/**
 * Stops a run still in progress (a message sent before the last reply
 * finished) and waits for it to settle, so its turn keeps its results and
 * the agent is free for the next message.
 */
async function _stopAsk(
  conversation: DataAgentConversation,
  activeAsk: Promise<unknown>,
): Promise<void> {
  conversation.dataAgent.agent.abort();
  await activeAsk.catch(() => {
    // The stopped turn reports its own failure.
  });
}

/** Asks the agent, marking the conversation busy until the run settles. */
async function _askAgent(
  conversation: DataAgentConversation,
  text: string,
): Promise<Awaited<ReturnType<DataAgentConversation["dataAgent"]["ask"]>>> {
  const ask = conversation.dataAgent.ask(text);
  conversation.activeAsk = ask;
  try {
    return await ask;
  } finally {
    if (conversation.activeAsk === ask) {
      conversation.activeAsk = undefined;
    }
  }
}

async function _getConversation(
  options: Readonly<AskConversationDataAgentOptions>,
): Promise<{ conversation: DataAgentConversation; isNew: boolean }> {
  const { conversations, turn } = options;
  const key = buildConversationKey(turn);
  const existing = conversations.get(key);
  if (existing) {
    return { conversation: existing, isNew: false };
  }
  const conversation = await options.createConversation({ current: turn });
  _dropOtherChats(conversations, turn);
  conversations.set(key, conversation);
  return { conversation, isNew: true };
}

/** What one turn adds before the message, built from its conversation. */
export type AgentTurnInputs = {
  blocks: AgentContextBlocks;
  /** How the model hears each mention, masked with the vault. */
  nameOf: (ref: Gadget.Ref) => string;
};

type AskConversationDataAgentOptions = {
  conversations: Map<string, DataAgentConversation>;
  turn: Readonly<DataAgentTurnOptions>;
  /**
   * The turn's blocks and mention names, built from the conversation it
   * goes to, whose vault hides personal values in every block's SQL.
   */
  buildTurnInputs?: (conversation: DataAgentConversation) => AgentTurnInputs;
  createConversation: (
    turnRef: AgentConversationState["turnRef"],
  ) => Promise<DataAgentConversation>;
};

/**
 * The thread as the agent reads it: each user message's mentions as
 * `@"Name"` with the turn's masked names. Without inputs, the thread as is.
 */
function _namedMessages(
  turn: Readonly<DataAgentTurnOptions>,
  inputs: AgentTurnInputs | undefined,
): ReadonlyArray<Pick<ChatClientMessage.T, "role" | "content">> {
  if (!inputs) {
    return turn.apiMessages;
  }
  return turn.apiMessages.map((message) => {
    return message.role === "user"
      ? {
          role: message.role,
          content: ChatMentionToken.toModelText(message.content, inputs.nameOf),
        }
      : message;
  });
}

/**
 * Asks this conversation's agent the turn's message, creating the
 * conversation on its first turn, and returns the reply with any results
 * this turn added to the chat. `conversations` holds one per
 * `${workspaceId}:${chatGeneration}`, so follow-ups see earlier turns. The
 * page, attached, and mentioned blocks, when there are any, start the
 * message, and each mention in the thread reads as `@"Name"`. A run still
 * in progress is stopped first, since a conversation answers one message at
 * a time.
 */
export async function askConversationDataAgent(
  options: Readonly<AskConversationDataAgentOptions>,
): Promise<ChatModelRunResult> {
  const { turn } = options;
  const { conversation, isNew } = await _getConversation(options);
  // Checked again after every wait: another message may have started a run
  // meanwhile. From the last check to the ask, nothing awaits.
  while (conversation.activeAsk) {
    await _stopAsk(conversation, conversation.activeAsk);
  }
  // A fresh list per turn: a stopped run's late results land in its own.
  const results: AgentQueryResultData[] = [];
  conversation.turnRef.current = turn;
  conversation.results = results;
  turn.chatPanelDispatch.setPendingClarification(undefined);
  const inputs = options.buildTurnInputs?.(conversation);
  const blocks = inputs?.blocks ?? {};
  const reply = await _askAgent(
    conversation,
    buildAgentTurnText({
      message: _buildPromptText(_namedMessages(turn, inputs), isNew),
      pageBlock: blocks.pageBlock,
      previousPageBlock: conversation.lastPageBlock,
      attachedBlock: blocks.attachedBlock,
      previousAttachedBlock: conversation.lastAttachedBlock,
      mentionedBlock: blocks.mentionedBlock,
    }),
  );
  conversation.lastPageBlock = blocks.pageBlock ?? conversation.lastPageBlock;
  conversation.lastAttachedBlock = blocks.attachedBlock;
  return {
    content: [
      { type: "text", text: reply.text },
      ...results.map(AgentQueryResult.toDataPart),
    ],
  };
}
