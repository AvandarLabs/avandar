import { buildChatSessionTitleExcerpt } from "$/agent/chatTitle/buildChatSessionTitleExcerpt";
import { APIClient } from "@/clients/APIClient";
import { requestChatSessionTitle } from "@/components/ChatPanel/ChatSessionTitle/requestChatSessionTitle";
import { OfflineAnswerMessage } from "@/components/ChatPanel/OfflineAnswerMessage/OfflineAnswerMessage";
import { OfflineChatEngineStore } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";
import type { ChatSessionKind } from "@/components/ChatPanel/ChatSessionIndex/ChatSessionIndex";
import type { useChatSessions } from "@/components/ChatPanel/ChatSessionProvider/useChatSessions";
import type { ThreadMessageLike } from "@assistant-ui/react";

type RequestStoredSessionTitleOptions = {
  messages: readonly ThreadMessageLike[];
  mask: ((text: string) => string) | undefined;
  sessionId: string;
  workspaceId: string;
  sessions: ReturnType<typeof useChatSessions>;
  locale: string;
  placeholders: Readonly<Record<ChatSessionKind, string>>;
};

/**
 * Requests a stored reply's title with the redactor selected for that turn.
 * The runtime calls it after the thread write succeeds.
 */
export function requestStoredSessionTitle(
  options: Readonly<RequestStoredSessionTitleOptions>,
): void {
  const sessions = options.sessions;
  if (!sessions || !options.mask) {
    return;
  }
  const session = sessions.index.sessions[options.sessionId];
  const assistant = [...options.messages].reverse().find((message) => {
    return message.role === "assistant";
  });
  if (!session?.titleIsPlaceholder || !assistant) {
    return;
  }
  const placeholder = options.placeholders[session.kind];
  void requestChatSessionTitle({
    sessionId: options.sessionId,
    kind: session.kind,
    workspaceId: options.workspaceId,
    excerpt: buildChatSessionTitleExcerpt({
      messages: options.messages,
      mask: options.mask,
      offlineAnswerText: OfflineAnswerMessage.hostedContent,
    }),
    locale: options.locale,
    placeholder,
    isOffline: OfflineAnswerMessage.isOfflineAnswer(assistant.metadata),
    post: APIClient.post,
    completeOffline: OfflineChatEngineStore.complete,
    setSessionTitle: sessions.setSessionTitle,
  }).catch(() => {
    // The stored placeholder remains the fallback title.
    return undefined;
  });
}
