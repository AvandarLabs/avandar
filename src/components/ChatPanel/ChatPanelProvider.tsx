import { ReactNode, useEffect } from "react";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager";
import { ChatPanelAvailableContext } from "@/components/ChatPanel/useIsChatPanelAvailable";

const LS_KEY = "ava.chat.aside.open";

function readInitialOpen(): boolean {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw === "true";
  } catch {
    return false;
  }
}

function PersistOpenState(): null {
  const { isOpen } = ChatPanelStateManager.useState();

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_KEY, String(isOpen));
    } catch {
      // Private browsing or storage disabled — fall back to in-memory only.
    }
  }, [isOpen]);

  return null;
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
      initialStateOverrides={{ isOpen: readInitialOpen() }}
    >
      <ChatPanelAvailableContext.Provider value={true}>
        <PersistOpenState />
        {children}
      </ChatPanelAvailableContext.Provider>
    </ChatPanelStateManager.Provider>
  );
}
