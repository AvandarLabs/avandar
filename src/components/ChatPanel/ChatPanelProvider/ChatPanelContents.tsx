import { ReactNode, useEffect } from "react";
import { ChatPanelStateManager } from "../ChatPanelStateManager/ChatPanelStateManager";

export const CHAT_PANEL_LOCAL_STORAGE_KEY = "ava.chat.aside.open" as const;

type Props = {
  children: ReactNode;
};

export function ChatPanelContents({ children }: Props): JSX.Element {
  const { isOpen } = ChatPanelStateManager.useState();

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAT_PANEL_LOCAL_STORAGE_KEY, String(isOpen));
    } catch {
      // Private browsing or storage disabled: fall back to in-memory only.
    }
  }, [isOpen]);

  return <>{children}</>;
}
