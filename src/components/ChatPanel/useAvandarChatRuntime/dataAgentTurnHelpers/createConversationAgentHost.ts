import { recordClarificationShown } from "@/components/ChatPanel/recordClarificationShown/recordClarificationShown";
import { addAgentDashboardBlock } from "@/components/ChatPanel/useAvandarChatRuntime/dashboardBlocks/addAgentDashboardBlock";
import {
  createExplorerShowQuery,
  getTurnQuestionLabel,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import {
  checkQueryOnDevice,
  showQueryInChat,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/showQueryInChat";
import { buildClarificationTurnNumber } from "@/components/privacy/privacy-helpers/generatedSqlAssumptions/generatedSqlAssumptions";
import { createBrowserDataAgentHost } from "@/lib/agent/dataAgent/browser/createBrowserDataAgentHost";
import { createPlaceholderRestoringHost } from "@/lib/agent/dataAgent/pagePrivacy/createPlaceholderRestoringHost";
import { createSqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { ChatClarifyRequest } from "$/types/chat.types";
import type {
  AgentConversationState,
  DataAgentConversation,
  DataAgentTurnOptions,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";
import type { DataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";

/**
 * Results go to the Data Explorer when the user is on it, and for an
 * offline turn that carries no page at all. Any other page, including one
 * the app could not identify, sends them to the chat, which shows them
 * anywhere.
 */
function _isOnDataExplorer(turn: DataAgentTurnOptions): boolean {
  return (
    turn.pageContext?.app === "data-explorer" ||
    (turn.isOffline === true && turn.pageContext === undefined)
  );
}

/**
 * Bias-checks and records a question card the agent shows, then sets it in
 * the current turn's chat panel with its audit id. The turn number counts
 * the turn's card answers. A card whose turn went stale, or stopped being
 * the conversation's current turn, while its row was written is not set.
 * The row stays.
 */
async function _showQuestionCard(
  options: Readonly<{
    state: AgentConversationState;
    card: Omit<ChatClarifyRequest, "turnNumber">;
  }>,
): Promise<void> {
  const { state, card } = options;
  const turn = state.turnRef.current;
  const clarification: ChatClarifyRequest = {
    ...card,
    turnNumber: buildClarificationTurnNumber(turn.apiMessages),
  };
  const auditId = await recordClarificationShown({
    workspaceId: turn.workspaceId,
    clarification,
  });
  if (turn.isStale?.() || state.turnRef.current !== turn) {
    return;
  }
  turn.chatPanelDispatch.setPendingClarification({
    ...clarification,
    auditId,
  });
}

/**
 * Shows the agent's query where the turn's page sends it, first noting it as
 * the turn's last shown query: `data_explorer` when it goes to the Data
 * Explorer, the turn's app otherwise. The SQL is already restored.
 */
function _showQuery(
  state: AgentConversationState,
  request: Parameters<DataAgentHost["showQuery"]>[0],
): ReturnType<DataAgentHost["showQuery"]> {
  const turn = state.turnRef.current;
  const isOnExplorer = _isOnDataExplorer(turn);
  state.lastShownQuery = {
    sql: request.sql,
    app: isOnExplorer ? "data_explorer" : turn.analyticsApp,
  };
  if (isOnExplorer) {
    return createExplorerShowQuery(turn)(request);
  }
  return showQueryInChat({
    workspaceId: turn.workspaceId,
    title: getTurnQuestionLabel(turn),
    results: state.results,
    request,
  });
}

/**
 * The browser host for one conversation's agent. Each call reads the
 * current turn, so a follow-up sent from another page shows its result
 * there: in the Data Explorer when the user is on it, in the chat otherwise.
 * The agent never changes the page. Page placeholders in the agent's SQL are
 * restored from the conversation's vault before anything runs, so the
 * explorer and the chat result card get the real SQL.
 */
export function createConversationAgentHost(
  state: AgentConversationState,
): DataAgentHost {
  const firstTurn = state.turnRef.current;
  const browserHost = createBrowserDataAgentHost({
    workspaceId: firstTurn.workspaceId,
    userId: firstTurn.currentUser?.id,
    showQuery: (request) => {
      return _showQuery(state, request);
    },
    checkQuery: (sql) => {
      return checkQueryOnDevice({
        workspaceId: state.turnRef.current.workspaceId,
        sql,
      });
    },
    addDashboardBlock: (request) => {
      return addAgentDashboardBlock({
        turn: state.turnRef.current,
        cards: state.dashboardCards,
        request,
      });
    },
    showQuestionCard: (card) => {
      return _showQuestionCard({ state, card });
    },
  });
  return createPlaceholderRestoringHost(browserHost, state.sqlVault);
}

/**
 * A new conversation whose agent runs against a conversation host. The host
 * holds the returned object itself, since `askConversationDataAgent`
 * updates its turn and results in place on every turn.
 */
export function createAgentConversation(
  options: Readonly<{
    turnRef: AgentConversationState["turnRef"];
    datasets: readonly DataAgentDataset[];
    createDataAgent: (host: DataAgentHost) => DataAgent;
  }>,
): DataAgentConversation {
  const state: AgentConversationState = {
    turnRef: options.turnRef,
    results: [],
    resultsByTurn: [],
    sqlVault: createSqlPlaceholderVault(),
    dashboardCards: [],
  };
  const host = createConversationAgentHost(state);
  return Object.assign(state, {
    datasets: options.datasets,
    dataAgent: options.createDataAgent(host),
  });
}
