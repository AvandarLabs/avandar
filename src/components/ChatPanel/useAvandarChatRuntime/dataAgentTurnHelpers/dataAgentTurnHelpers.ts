import { where } from "@avandar/utils";
import { HostedAnswerText } from "$/agent/HostedAnswerText/HostedAnswerText";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { buildAgentTurnText } from "$/agent/pageContext/buildAgentTurnText";
import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AgentDashboardBlock } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlock";
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import { buildLocalGadgetName } from "@/components/ChatPanel/useAvandarChatRuntime/agentMentions/loadTurnGadgetContext";
import { DataAgentDatasetCache } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/DataAgentDatasetCache";
import { getLastQuestionFromMessages } from "@/components/ChatPanel/useAvandarChatRuntime/getLastQuestionFromMessages/getLastQuestionFromMessages";
import {
  readAppliedSqlResult,
  waitForAppliedSqlOutcome,
} from "@/components/ChatPanel/useAvandarChatRuntime/waitForAppliedSqlOutcome/waitForAppliedSqlOutcome";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { hideEarlierPlaceholders } from "@/lib/agent/dataAgent/pagePrivacy/hideEarlierPlaceholders/hideEarlierPlaceholders";
import { loadColumnCodes } from "@/lib/dataDictionaries/loadColumnCodes/loadColumnCodes";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { AgentContextBlocks } from "$/agent/mentions/buildAgentContextBlocks";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatDashboardVizType } from "$/types/chat.types";
import type { AgentDashboardBlockData } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlock";
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

/**
 * The turn's question as a label shows it on this device: the turn's
 * `questionLabel`, or its last question with each mention as `@Name`.
 */
export function getTurnQuestionLabel(
  turn: Readonly<DataAgentTurnOptions>,
): string {
  return (
    turn.questionLabel ??
    getLastQuestionFromMessages(
      turn.apiMessages,
      buildLocalGadgetName(turn.gadgetContext),
    )
  );
}

/** Puts the agent's SQL into the Data Explorer, which runs and shows it. */
function _applySqlToExplorer(
  options: Readonly<DataAgentTurnOptions>,
  request: ShowQueryRequest,
): void {
  const { dataExplorerDispatch } = options;
  dataExplorerDispatch.setRawSql(request.sql);
  dataExplorerDispatch.setNlPrompt(getTurnQuestionLabel(options));
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
  const [datasets, codesByColumnId] = await Promise.all([
    DatasetClient.getAllDatasetsWithColumns(
      where("workspace_id", "eq", workspaceId),
    ),
    loadColumnCodes(workspaceId),
  ]);
  return datasets.map((dataset) => {
    return {
      id: dataset.id,
      name: dataset.name,
      columns: dataset.columns.map((column) => {
        const codes = codesByColumnId.get(column.id);
        return {
          name: column.name,
          dataType: String(column.dataType),
          ...(codes ? { codes: ColumnCodes.toContext(codes) } : {}),
        };
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
  /**
   * An earlier assistant reply as the model reads it in the recap, with
   * the values the vault holds masked. Called after every redaction of the
   * turn. Offline answers never get here: the thread already reads them as
   * a fixed line.
   */
  maskAssistantText: (text: string) => string;
  /**
   * The agent's reply as the user reads it, with each placeholder a hosted
   * model wrote swapped for the value the vault holds. Set only on a hosted
   * turn. A device turn's model never sees placeholders, so its reply is
   * shown as written. Never send its result to a hosted model.
   */
  unmaskReplyText?: (text: string) => string;
  /** Lines about dashboard cards the user resolved, sent first. */
  dashboardCardLines?: readonly string[];
  /** Runs after a kept reply, to mark those cards heard. */
  onReplied?: () => void;
};

type AskConversationDataAgentOptions = {
  conversations: Map<string, DataAgentConversation>;
  turn: Readonly<DataAgentTurnOptions>;
  /** Runs after this turn is attached to its conversation, before the ask. */
  onConversationReady?: (conversation: DataAgentConversation) => void;
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
 * `@"Name"` with the turn's masked names, and each assistant reply with
 * vault values masked. Without inputs, the thread as is. In a new
 * conversation every placeholder in the thread's own text is hidden first:
 * it came from a vault that is gone, and the new vault numbers other values
 * from `<value 1>` again. The names and values masked after that use the
 * new vault, so they keep meaning what the turn's blocks say they mean.
 */
function _namedMessages(
  turn: Readonly<DataAgentTurnOptions>,
  inputs: AgentTurnInputs | undefined,
  isNewConversation: boolean,
): ReadonlyArray<Pick<ChatClientMessage.T, "role" | "content">> {
  if (!inputs) {
    return turn.apiMessages;
  }
  const readText = (text: string): string => {
    return isNewConversation ? hideEarlierPlaceholders(text) : text;
  };
  return turn.apiMessages.map((message) => {
    return message.role === "user"
      ? {
          role: message.role,
          content: ChatMentionToken.toModelText(
            readText(message.content),
            inputs.nameOf,
          ),
        }
      : {
          role: message.role,
          content: inputs.maskAssistantText(readText(message.content)),
        };
  });
}

/** What one turn's run result is built from. */
type RunResultOptions = {
  /** The reply as the model wrote it, placeholders included. */
  replyText: string;
  inputs: AgentTurnInputs | undefined;
  results: readonly AgentQueryResultData[];
  dashboardCards: readonly AgentDashboardBlockData[];
};

/**
 * The turn's run result: the reply the user reads, then the turn's results
 * and dashboard cards. A hosted reply is shown with real values in place of
 * its placeholders, and the text the model wrote is kept in the message
 * metadata, so no later request to a hosted model reads the real values.
 */
function _toRunResult(options: Readonly<RunResultOptions>): ChatModelRunResult {
  const { replyText, inputs } = options;
  const shownText = inputs?.unmaskReplyText?.(replyText) ?? replyText;
  return {
    content: [
      { type: "text", text: shownText },
      ...options.results.map(AgentQueryResult.toDataPart),
      ...options.dashboardCards.map(AgentDashboardBlock.toDataPart),
    ],
    ...(shownText === replyText
      ? {}
      : { metadata: HostedAnswerText.toMetadata(replyText) }),
  };
}

/**
 * The text of the agent's reply. A reply with no text of its own because
 * the agent failed to build a chart reads as the turn's translated copy.
 */
function _replyTextOf(
  reply: Awaited<ReturnType<DataAgentConversation["dataAgent"]["ask"]>>,
  turn: Readonly<DataAgentTurnOptions>,
): string {
  return reply.failure === "chart_not_built"
    ? turn.copy.chartNotBuilt
    : reply.text;
}

/**
 * Tells the turn's inputs the agent replied, unless the reply is being
 * discarded. A discarded reply leaves nothing in the thread, so the agent
 * must hear about its cards again on the next turn.
 */
function _reportReplyIfKept(
  turn: Readonly<DataAgentTurnOptions>,
  inputs: AgentTurnInputs | undefined,
): void {
  if (!turn.isStale?.()) {
    inputs?.onReplied?.();
  }
}

/**
 * Asks this conversation's agent the turn's message, creating the
 * conversation on its first turn, and returns the reply with any results
 * this turn added to the chat. `conversations` holds one per
 * `${workspaceId}:${chatGeneration}`, so follow-ups see earlier turns. The
 * page, attached, and mentioned blocks, when there are any, start the
 * message, and each mention in the thread reads as `@"Name"`. A hosted
 * turn's reply is shown with real values in place of its placeholders. A
 * run still in progress is stopped first, since a conversation answers one
 * message at a time.
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
  const dashboardCards: AgentDashboardBlockData[] = [];
  conversation.turnRef.current = turn;
  conversation.results = results;
  conversation.resultsByTurn.push(results);
  conversation.dashboardCards = dashboardCards;
  turn.chatPanelDispatch.setPendingClarification(undefined);
  options.onConversationReady?.(conversation);
  const inputs = options.buildTurnInputs?.(conversation);
  const blocks = inputs?.blocks ?? {};
  const reply = await _askAgent(
    conversation,
    buildAgentTurnText({
      message: _buildPromptText(_namedMessages(turn, inputs, isNew), isNew),
      pageBlock: blocks.pageBlock,
      previousPageBlock: conversation.lastPageBlock,
      attachedBlock: blocks.attachedBlock,
      previousAttachedBlock: conversation.lastAttachedBlock,
      mentionedBlock: blocks.mentionedBlock,
      dashboardCardLines: inputs?.dashboardCardLines,
    }),
  );
  _reportReplyIfKept(turn, inputs);
  conversation.lastPageBlock = blocks.pageBlock ?? conversation.lastPageBlock;
  conversation.lastAttachedBlock = blocks.attachedBlock;
  return _toRunResult({
    replyText: _replyTextOf(reply, turn),
    inputs,
    results,
    dashboardCards,
  });
}
