import { createAppStateManager } from "@/lib/utils/state/createAppStateManager/createAppStateManager";
import type { ChatClarifyRequest } from "$/types/chat.types";

/** Clarification carrying an optional audit log row id so telemetry can
 *  link the "shown" event with the eventual answered/cancelled outcome. */
type PendingClarification = ChatClarifyRequest & { auditId?: string };

type ChatPanelState = {
  isOpen: boolean;
  isAvailable: boolean;
  /**
   * The clarification the LLM most recently asked for, awaiting a user
   * answer. Set when the chat runtime sees `response.clarification`; cleared
   * once the user submits an answer.
   */
  pendingClarification: PendingClarification | undefined;
};

const initialState: ChatPanelState = {
  isOpen: false,
  isAvailable: true,
  pendingClarification: undefined,
};

/**
 * State manager for the AppShell's right-side chat panel ("Ask Avandar").
 *
 * Tracks whether the Aside slot is open or collapsed, whether the panel is
 * available on the current route (`isAvailable`), and the inline clarification
 * flow.
 *
 * Persistence to `localStorage` is handled by `ChatPanelProvider`, which wraps
 * this manager's `Provider`. Outside that provider, `defaultState.isAvailable`
 * is `false` so shared UI (e.g. AppToolbar) can hide the chat toggle.
 */
export const ChatPanelStateManager = createAppStateManager({
  name: "ChatPanel",
  initialState,
  defaultState: {
    isOpen: false,
    isAvailable: false,
    pendingClarification: undefined,
  },
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
      state: Readonly<ChatPanelState>,
      pendingClarification: PendingClarification | undefined,
    ) => {
      return { ...state, pendingClarification };
    },
  },
});
