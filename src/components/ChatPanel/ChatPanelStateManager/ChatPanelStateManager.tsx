import { createAppStateManager } from "@/lib/utils/state/createAppStateManager";

type ChatPanelState = {
  isOpen: boolean;
};

const initialState: ChatPanelState = {
  isOpen: false,
};

/**
 * State manager for the AppShell's right-side chat panel ("Ask Avandar").
 *
 * Tracks whether the Aside slot is open or collapsed. Persistence to
 * `localStorage` is handled by `ChatPanelProvider`, which wraps this
 * manager's `Provider`.
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
  },
});
