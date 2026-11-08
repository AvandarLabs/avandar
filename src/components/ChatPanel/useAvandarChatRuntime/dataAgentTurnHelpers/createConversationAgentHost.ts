import { createExplorerShowQuery } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import { showQueryInChat } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/showQueryInChat";
import { getLastQuestionFromMessages } from "@/components/ChatPanel/useAvandarChatRuntime/getLastQuestionFromMessages/getLastQuestionFromMessages";
import { createBrowserDataAgentHost } from "@/lib/agent/dataAgent/browser/createBrowserDataAgentHost";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { DataAgentTurnOptions } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";

/**
 * What a conversation's host reads on every call: the turn being answered
 * (the agent outlives each turn, so it must never keep the first one) and
 * the results this turn added to the chat.
 */
export type AgentConversationState = {
  turnRef: { current: DataAgentTurnOptions };
  results: AgentQueryResultData[];
};

function _isOnDataExplorer(turn: DataAgentTurnOptions): boolean {
  return (
    turn.pageContext === undefined || turn.pageContext.app === "data-explorer"
  );
}

/**
 * The browser host for one conversation's agent. Each call reads the
 * current turn, so a follow-up sent from another page shows its result
 * there: in the Data Explorer when the user is on it, in the chat otherwise.
 * The agent never changes the page.
 */
export function createConversationAgentHost(
  state: AgentConversationState,
): DataAgentHost {
  const firstTurn = state.turnRef.current;
  return createBrowserDataAgentHost({
    workspaceId: firstTurn.workspaceId,
    userId: firstTurn.currentUser?.id,
    showQuery: (request) => {
      const turn = state.turnRef.current;
      if (_isOnDataExplorer(turn)) {
        return createExplorerShowQuery(turn)(request);
      }
      return showQueryInChat({
        workspaceId: turn.workspaceId,
        title: getLastQuestionFromMessages(turn.apiMessages),
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
}
