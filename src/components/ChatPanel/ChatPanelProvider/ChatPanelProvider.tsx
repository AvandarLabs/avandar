import {
  CHAT_PANEL_LOCAL_STORAGE_KEY,
  ChatPanelContents,
} from "@/components/ChatPanel/ChatPanelProvider/ChatPanelContents";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { PlanStateManager } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import { ChatPanelAvailableContext } from "@/components/ChatPanel/useIsChatPanelAvailable";
import type { ReactNode } from "react";

function _readInitialOpen(): boolean {
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
 * share the same lifetime as the chat panel itself — closing or
 * remounting the panel clears plan state.
 */
export function ChatPanelProvider({
  children,
  isChatAvailable = true,
}: Props): JSX.Element {
  return (
    <ChatPanelStateManager.Provider
      initialStateOverrides={{
        isOpen: _readInitialOpen(),
        pendingClarification: undefined,
      }}
    >
      {isChatAvailable ?
        <PlanStateManager.Provider>
          <ChatPanelAvailableContext.Provider value={true}>
            <ChatPanelContents>{children}</ChatPanelContents>
          </ChatPanelAvailableContext.Provider>
        </PlanStateManager.Provider>
      : <ChatPanelAvailableContext.Provider value={false}>
          <ChatPanelContents>{children}</ChatPanelContents>
        </ChatPanelAvailableContext.Provider>
      }
    </ChatPanelStateManager.Provider>
  );
}
