import {
  CHAT_PANEL_LOCAL_STORAGE_KEY,
  ChatPanelContents,
} from "@/components/ChatPanel/ChatPanelProvider/ChatPanelContents";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
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
   * When false, only supplies AppShell aside open/close state without chat UI
   * or a toolbar toggle. Use on routes outside `/$workspaceSlug`.
   */
  isChatAvailable?: boolean;
};

/**
 * Provider for the chat panel state. Wraps `ChatPanelStateManager.Provider`,
 * seeds the initial `isOpen` value from `localStorage`, and writes it back
 * whenever it changes so the panel state survives page reloads.
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
      <ChatPanelContents>{children}</ChatPanelContents>
    </ChatPanelStateManager.Provider>
  );
}
