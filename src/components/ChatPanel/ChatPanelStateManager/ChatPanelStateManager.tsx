import { createAppStateManager } from "@/lib/utils/state/createAppStateManager";
import type { ChatClarifyRequest } from "$/types/chat.types";

type ChatPanelState = {
  isOpen: boolean;
  /**
   * The clarification the LLM most recently asked for, awaiting a user
   * answer. Set when the chat runtime sees `response.clarification`; cleared
   * once the user submits an answer or chooses "Let AI decide".
   */
  pendingClarification: ChatClarifyRequest | undefined;
};

const initialState: ChatPanelState = {
  isOpen: false,
  pendingClarification: undefined,
};

/**
 * State manager for the AppShell's right-side chat panel ("Ask Avandar").
 *
 * Tracks whether the Aside slot is open or collapsed and the inline
 * clarification flow. Persistence to `localStorage` is handled by
 * `ChatPanelProvider`, which wraps this manager's `Provider`.
 */
export const ChatPanelStateManager = createAppStateManager({
  name: "ChatPanel",
  initialState,
  actions: {
    open: (state: ChatPanelState) => {
      return { ...state, isOpen: true };
    },
    close: (state: ChatPanelState) => {
      return { ...state, isOpen: false };
    },
    toggle: (state: ChatPanelState) => {
      return { ...state, isOpen: !state.isOpen };
    },
    setPendingClarification: (
      state: ChatPanelState,
      pendingClarification: ChatClarifyRequest | undefined,
    ) => {
      return { ...state, pendingClarification };
    },
  },
});
