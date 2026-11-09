import {
  createExplorerShowQuery,
  getTurnQuestionLabel,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import { showQueryInChat } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/showQueryInChat";
import { createBrowserDataAgentHost } from "@/lib/agent/dataAgent/browser/createBrowserDataAgentHost";
import { createPlaceholderRestoringHost } from "@/lib/agent/dataAgent/pagePrivacy/createPlaceholderRestoringHost";
import { createSqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type {
  AgentConversationState,
  DataAgentConversation,
  DataAgentTurnOptions,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";
import type { DataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";

/**
 * Results go to the Data Explorer only when the turn says so: the user is on
 * it, or the turn is offline (offline turns run only there). An unknown page
 * sends them to the chat, which shows them on any page.
 */
function _isOnDataExplorer(turn: DataAgentTurnOptions): boolean {
  return turn.isOffline === true || turn.pageContext?.app === "data-explorer";
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
      const turn = state.turnRef.current;
      if (_isOnDataExplorer(turn)) {
        return createExplorerShowQuery(turn)(request);
      }
      return showQueryInChat({
        workspaceId: turn.workspaceId,
        title: getTurnQuestionLabel(turn),
        results: state.results,
        request,
      });
    },
    showQuestionCard: (clarification) => {
      state.turnRef.current.chatPanelDispatch.setPendingClarification(
        clarification,
      );
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
    sqlVault: createSqlPlaceholderVault(),
  };
  const host = createConversationAgentHost(state);
  return Object.assign(state, {
    datasets: options.datasets,
    dataAgent: options.createDataAgent(host),
  });
}
