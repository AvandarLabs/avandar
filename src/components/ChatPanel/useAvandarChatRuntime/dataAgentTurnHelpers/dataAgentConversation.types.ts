import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types";
import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { AnalyticsApp } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import type { AgentDashboardBlockData } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlock";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { ChatRuntimeCopy } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import type { DataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { SqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";
import type {
  DashboardEditorAppState,
  DashboardEditorStateManager,
} from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import type { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { useSqlToStructuredQuery } from "@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery";
import type { MutableRefObject } from "react";

/**
 * The chat's attached gadgets and what every gadget the thread mentions
 * holds, loaded once when the turn starts.
 */
export type AgentTurnGadgetContext = {
  /** The tray, in order. */
  attachedRefs: readonly Gadget.Ref[];
  /**
   * Each referenced gadget's context by `ChatMentionToken.buildRefKey`, or
   * undefined when loading failed. Then the turn sends no attached or
   * mentioned block and names every mention as unavailable.
   */
  contexts: ReadonlyMap<string, AgentGadgetContext> | undefined;
};

/** The chat runtime pieces a data agent turn uses, online or offline. */
export type DataAgentTurnOptions = {
  apiMessages: readonly ChatClientMessage.T[];
  workspaceId: Workspace.Id;
  currentUser: User.T | undefined;
  /** Identifies the conversation; a new chat gets a new agent. */
  chatGeneration: number;
  /** Receives the completed hosted turn's page-value mask for its title. */
  titleMaskRef?: MutableRefObject<((text: string) => string) | undefined>;
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
   * The page's app as `chat.message_sent` records it. A shown query's
   * `chat.sql_generated` names it, unless the query went to the Data
   * Explorer.
   */
  analyticsApp?: AnalyticsApp;
  /**
   * True for a turn answered by the offline models. Its answer is marked as
   * offline. Its results go where an online turn's do once it carries a page
   * context.
   */
  isOffline?: boolean;
  /**
   * Set when the chat has attached gadgets or the thread mentions any.
   * `apiMessages` then still hold ref tokens: only the agent path reads
   * them, and it converts them with the conversation's vault.
   */
  gadgetContext?: AgentTurnGadgetContext;
  /**
   * The question as labels on this device show it, each mention as
   * `@Name`. Set when `apiMessages` already name their mentions for a
   * model (offline turns), so labels still read `@Name`.
   */
  questionLabel?: string;
  /**
   * The plugin AI tools installed in the workspace, read at the start of
   * every agent `ask`. The agent offers none when it is not set.
   */
  getPluginAiTools?: () => readonly PluginAiToolDeclaration[];
  /** The workspace's slug, for the API a plugin AI tool receives. */
  workspaceSlug?: string;
  /**
   * The dashboard editor when the turn started: the dashboard it shows, and
   * how to add a block to it unsaved. Absent where no editor is known.
   */
  dashboardEditor?: {
    activeDashboardId: string | undefined;
    dispatch: ReturnType<typeof DashboardEditorStateManager.useDispatch>;
    /** Reads the editor's state now, for a block's analytics payload. */
    getState: () => DashboardEditorAppState;
  };
  /** The chat session the turn belongs to, for its dashboard cards. */
  sessionId?: string;
  /**
   * The words for replies the agent has none for, already translated.
   * `chartNotBuilt` is the reply when a dashboard chart's query kept failing.
   */
  copy: Pick<ChatRuntimeCopy, "chartNotBuilt">;
  /**
   * True once the chat moved on (a reset or another session) and the turn's
   * reply will be thrown away. Then nothing about the reply is recorded.
   */
  isStale?: () => boolean;
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
   * Each turn's `results` list, oldest first, including this turn's. A
   * plugin AI tool off the Data Explorer reads the last result in them, so a
   * result an earlier turn showed stays on screen for the next one.
   */
  resultsByTurn: AgentQueryResultData[][];
  /**
   * Created with the conversation. Page blocks hide values with it, and the
   * host restores them before SQL runs. An offline conversation never
   * redacts, so its vault stays empty and restoring changes nothing.
   */
  sqlVault: SqlPlaceholderVault;
  /** Dashboard cards this turn added to the chat. Reset every turn. */
  dashboardCards: AgentDashboardBlockData[];
  /**
   * The last query this turn showed, and where it went, for the turn's one
   * `chat.sql_generated`. Reset every turn, and cleared when a newer message
   * stops the run. A stopped turn never logs it, whatever this holds.
   */
  lastShownQuery?: { sql: string; app: AnalyticsApp | undefined };
};

/**
 * The user messages of the thread one ask was given, and how the ask ended.
 * `askConversationDataAgent` writes it once an ask settles, through
 * `createAgentAskRecord`, and `getAgentTurnKind` reads it to classify the
 * next turn. Assistant messages are left out: a run a newer message stopped
 * can fill in its reply after the newer turn was sent without it.
 */
export type AgentAskRecord = {
  /** `chatMessagesKey` of the user messages in the turn's `apiMessages`. */
  threadKey: string;
  /** How many user messages that thread held. */
  messageCount: number;
  /** The ask resolved and its turn was not stale. */
  isKept: boolean;
};

/** One conversation's agent, the turn it is answering, and its results. */
export type DataAgentConversation = AgentConversationState & {
  dataAgent: DataAgent;
  /**
   * The datasets the agent was created with. Table aliases are positional,
   * so every page block in this conversation is built from this same list.
   */
  datasets: readonly DataAgentDataset[];
  /**
   * The page block last sent in full, to send "unchanged" instead of
   * repeats. Recorded once the agent has the turn's text, even if its answer
   * then failed, and not for a turn that failed before. An empty Data
   * Explorer's block that a device turn left out is not recorded.
   */
  lastPageBlock?: string;
  /**
   * The attached block the agent last took, to send "unchanged" or "cleared"
   * lines. Recorded on the same terms as `lastPageBlock`.
   */
  lastAttachedBlock?: string;
  /** The agent's run in progress, if any. A conversation runs one at once. */
  activeAsk?: Promise<unknown>;
  /**
   * The last turn whose run a newer message stopped. Written by
   * `askConversationDataAgent` when it stops a run, and read once that run
   * settles, so the stopped turn logs no `chat.sql_generated` even when a
   * tool still running shows a query after the stop.
   */
  stoppedTurn?: DataAgentTurnOptions;
  /**
   * The last ask that settled, to tell a Try again from a follow-up. Unset
   * until one does. In memory only, so a reload or a session switch forgets
   * it.
   */
  lastAsk?: AgentAskRecord;
};
