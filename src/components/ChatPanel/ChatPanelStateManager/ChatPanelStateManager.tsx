import { createAppStateManager } from "@/lib/utils/state/createAppStateManager/createAppStateManager";

type ChatPanelState = {
  isOpen: boolean;
  isAvailable: boolean;
};

const initialState: ChatPanelState = {
  isOpen: false,
  isAvailable: true,
};

/**
 * State manager for the AppShell's right-side chat panel ("Ask Avandar").
 *
 * Tracks whether the Aside slot is open or collapsed and whether the panel
 * is available on the current route (`isAvailable`).
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
  },
});
