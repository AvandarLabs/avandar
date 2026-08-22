import type {
  ChatClarifyRequest,
  ChatProposedCaseType,
} from "$/types/chat.types";

import { createAppStateManager } from "@/lib/utils/state/createAppStateManager/createAppStateManager";

/** Clarification carrying an optional audit log row id so telemetry can
 *  link the "shown" event with the eventual answered/cancelled outcome. */
type PendingClarification = ChatClarifyRequest & { auditId?: string };

type ChatPanelLayout = "docked" | "composer";

type ChatPanelState = {
  isOpen: boolean;
  isAvailable: boolean;
  /**
   * `composer` overlays a wider Ask Avandar panel on the canvas. The AppShell
   * aside column stays at its docked width so the page does not shrink.
   */
  layout: ChatPanelLayout;
  /**
   * Incremented to start a fresh Case Manager design session (new thread +
   * seed turn). ChatPanel resets the thread and appends the seed prompt.
   */
  caseDesignSessionNonce: number;
  /**
   * The clarification the LLM most recently asked for, awaiting a user
   * answer. Set when the chat runtime sees `response.clarification`; cleared
   * once the user submits an answer.
   */
  pendingClarification: PendingClarification | undefined;
  /**
   * The case type draft the Case Manager model most recently proposed, awaiting
   * the user's edits. Held here rather than in the transcript so the card stays
   * editable; cleared once the user creates the case type or dismisses it.
   */
  pendingCaseTypeDraft: ChatProposedCaseType | undefined;
};

const initialState: ChatPanelState = {
  isOpen: false,
  isAvailable: true,
  layout: "docked",
  caseDesignSessionNonce: 0,
  pendingClarification: undefined,
  pendingCaseTypeDraft: undefined,
};

/**
 * State manager for the AppShell's right-side chat panel ("Ask Avandar").
 *
 * Tracks whether the Aside slot is open or collapsed, whether the panel is
 * available on the current route (`isAvailable`), the Case Manager composer
 * overlay layout, and the inline clarification and case type draft flows.
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
    layout: "docked",
    caseDesignSessionNonce: 0,
    pendingClarification: undefined,
    pendingCaseTypeDraft: undefined,
  },
  actions: {
    open: (state: ChatPanelState) => {
      return { ...state, isOpen: true };
    },
    close: (state: ChatPanelState) => {
      return { ...state, isOpen: false, layout: "docked" };
    },
    toggle: (state: ChatPanelState) => {
      return {
        ...state,
        isOpen: !state.isOpen,
        layout: state.isOpen ? "docked" : state.layout,
      };
    },
    collapseComposer: (state: ChatPanelState) => {
      return { ...state, layout: "docked" };
    },
    beginCaseDesign: (state: ChatPanelState) => {
      return {
        ...state,
        isOpen: true,
        layout: "composer",
        caseDesignSessionNonce: state.caseDesignSessionNonce + 1,
        pendingClarification: undefined,
        pendingCaseTypeDraft: undefined,
      };
    },
    setPendingClarification: (
      state: Readonly<ChatPanelState>,
      pendingClarification: PendingClarification | undefined,
    ) => {
      return { ...state, pendingClarification };
    },
    setPendingCaseTypeDraft: (
      state: Readonly<ChatPanelState>,
      pendingCaseTypeDraft: ChatProposedCaseType | undefined,
    ) => {
      return { ...state, pendingCaseTypeDraft };
    },
  },
});
