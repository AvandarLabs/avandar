import { createContext, useContext } from "react";
import type { ChatSessionIndex } from "@/components/ChatPanel/ChatSessionIndex/ChatSessionIndex";

/** The session index and mutations shared by the panel and case manager. */
export type ChatSessionActions = {
  index: ChatSessionIndex;
  startDataSession: () => void;
  startCaseDesignSession: () => void;
  selectSession: (sessionId: string) => void;
  archiveSession: (sessionId: string) => void;
  reopenSession: (sessionId: string) => void;
  deleteArchivedSession: (sessionId: string) => void;
  setSessionTitle: (sessionId: string, title: string) => void;
};

const MISSING_PROVIDER = Symbol("missing ChatSessionProvider");

/** Supplies the current chat session index to chat and case-manager UI. */
export const ChatSessionContext = createContext<
  ChatSessionActions | undefined | typeof MISSING_PROVIDER
>(MISSING_PROVIDER);

/**
 * Reads the shared chat sessions. Returns undefined while identity is absent
 * and throws when no `ChatSessionProvider` is mounted.
 */
export function useChatSessions(): ChatSessionActions | undefined {
  const sessions = useContext(ChatSessionContext);
  if (sessions === MISSING_PROVIDER) {
    throw new Error(
      "useChatSessions must be used inside <ChatSessionProvider>",
    );
  }
  return sessions;
}
