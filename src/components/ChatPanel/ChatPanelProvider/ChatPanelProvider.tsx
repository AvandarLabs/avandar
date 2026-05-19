import {
  CHAT_PANEL_LOCAL_STORAGE_KEY,
  ChatPanelContents,
} from "@/components/ChatPanel/ChatPanelProvider/ChatPanelContents";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
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
};

/**
 * Provider for the chat panel state. Wraps `ChatPanelStateManager.Provider`,
 * seeds the initial `isOpen` value from `localStorage`, and writes it back
 * whenever it changes so the panel state survives page reloads.
 */
export function ChatPanelProvider({ children }: Props): JSX.Element {
  return (
    <ChatPanelStateManager.Provider
      initialStateOverrides={{ isOpen: _readInitialOpen() }}
    >
      <ChatPanelAvailableContext.Provider value={true}>
        <ChatPanelContents>{children}</ChatPanelContents>
      </ChatPanelAvailableContext.Provider>
    </ChatPanelStateManager.Provider>
  );
}
