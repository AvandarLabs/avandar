import { ReactNode, useEffect } from "react";
import { ChatPanelStateManager } from "../ChatPanelStateManager/ChatPanelStateManager";

export const CHAT_PANEL_LOCAL_STORAGE_KEY = "ava.chat.aside.isOpen" as const;

type Props = {
  children: ReactNode;
};

/**
 * This component just passes the children through. It's main purpose is to
 * set the useEffect which persists the chat panel's open state to localStorage.
 */
export function ChatPanelContents({ children }: Props): JSX.Element {
  const { isOpen } = ChatPanelStateManager.useState();

  useEffect(
    function persistChatPanelOpenState() {
      try {
        window.localStorage.setItem(
          CHAT_PANEL_LOCAL_STORAGE_KEY,
          String(isOpen),
        );
      } catch {
        // Private browsing or storage disabled: fall back to in-memory only.
      }
    },
    [isOpen],
  );

  return <>{children}</>;
}
