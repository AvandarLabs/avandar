import {
  CHAT_PANEL_LOCAL_STORAGE_KEY,
  ChatPanelContents,
} from "@/components/ChatPanel/ChatPanelProvider/ChatPanelContents";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { PlanAnnotationStateManager } from "@/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager";
import { PlanBranchStateManager } from "@/components/ChatPanel/PlanStateManager/PlanBranchStateManager";
import { PlanStateManager } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import type { ReactNode } from "react";

function _readInitialChatPanelOpenState(): boolean {
  // wrap in try-catch in case localStorage is not available
  try {
    const raw = window.localStorage.getItem(CHAT_PANEL_LOCAL_STORAGE_KEY);
    return raw === "true";
  } catch {
    return false;
  }
}

type Props = {
  children: ReactNode;
  /**
   * When false, only supplies AppShell aside open/close state (no chat UI,
   * plan state, or toolbar toggle). Use on routes outside `/$workspaceSlug`.
   */
  isChatAvailable?: boolean;
};

/**
 * Provider for the chat panel state. Wraps `ChatPanelStateManager.Provider`,
 * seeds the initial `isOpen` value from `localStorage`, and writes it back
 * whenever it changes so the panel state survives page reloads.
 *
 * The `PlanStateManager` is nested here so that Phase 3 multi-step plans
 * share the same lifetime as the chat panel itself — closing or remounting
 * the panel clears plan state.
 */
export function ChatPanelProvider({
  children,
  isChatAvailable = true,
}: Props): JSX.Element {
  return (
    <ChatPanelStateManager.Provider
      initialStateOverrides={{
        isOpen: _readInitialChatPanelOpenState(),
        isAvailable: isChatAvailable,
        pendingClarification: undefined,
      }}
    >
      {isChatAvailable ?
        <PlanStateManager.Provider>
          <PlanBranchStateManager.Provider>
            <PlanAnnotationStateManager.Provider>
              <ChatPanelContents>{children}</ChatPanelContents>
            </PlanAnnotationStateManager.Provider>
          </PlanBranchStateManager.Provider>
        </PlanStateManager.Provider>
      : <ChatPanelContents>{children}</ChatPanelContents>}
    </ChatPanelStateManager.Provider>
  );
}
