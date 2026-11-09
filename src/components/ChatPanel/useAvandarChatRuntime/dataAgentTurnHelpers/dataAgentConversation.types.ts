import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { DataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { SqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";
import type { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { useSqlToStructuredQuery } from "@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery";
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
  /**
   * What is on screen for this turn. Decides where an online turn's query
   * results go: the Data Explorer when the user is on it, the chat
   * everywhere else, including when the page is unknown.
   */
  pageContext?: AgentPageContext;
  /**
   * True for a turn answered by the offline models. Offline turns run only
   * in the Data Explorer, so their results always go there.
   */
  isOffline?: boolean;
};

/**
 * What a conversation's host reads on every call: the turn being answered
 * (the agent outlives each turn, so it must never keep the first one), the
 * results this turn added to the chat, and the placeholders that stand for
 * personal values in the page SQL this conversation's model has read.
 */
export type AgentConversationState = {
  turnRef: { current: DataAgentTurnOptions };
  results: AgentQueryResultData[];
  /**
   * Created with the conversation. Page blocks hide values with it, and the
   * host restores them before SQL runs. An offline conversation sends no
   * page block, so its vault stays empty and restoring changes nothing.
   */
  sqlVault: SqlPlaceholderVault;
};

/** One conversation's agent, the turn it is answering, and its results. */
export type DataAgentConversation = AgentConversationState & {
  dataAgent: DataAgent;
  /**
   * The datasets the agent was created with. Table aliases are positional,
   * so every page block in this conversation is built from this same list.
   */
  datasets: readonly DataAgentDataset[];
  /** The page block sent last, to send "unchanged" instead of repeats. */
  lastPageBlock?: string;
  /** The agent's run in progress, if any. A conversation runs one at once. */
  activeAsk?: Promise<unknown>;
};
