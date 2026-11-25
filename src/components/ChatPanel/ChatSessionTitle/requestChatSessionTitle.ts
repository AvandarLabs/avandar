import {
  buildChatTitleMessages,
  CHAT_TITLE_PROMPT_ID,
  parseChatTitleReply,
} from "$/agent/chatTitle/chatTitlePrompt";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import type { ChatSessionKind } from "@/components/ChatPanel/ChatSessionIndex/ChatSessionIndex";

type RequestChatSessionTitleOptions = {
  sessionId: string;
  kind: ChatSessionKind;
  workspaceId: string;
  excerpt: string;
  locale: string;
  placeholder: string;
  isOffline: boolean;
  post: (options: {
    route: "chat/:workspaceId/title/:promptId";
    pathParams: {
      workspaceId: string;
      promptId: typeof CHAT_TITLE_PROMPT_ID;
    };
    body: { excerpt: string; locale: string; placeholder: string };
  }) => Promise<{ title: string }>;
  completeOffline: (options: {
    modelId: LocalChatModel.Id;
    messages: Array<{ role: "system" | "user"; content: string }>;
    maxTokens: number;
    temperature: number;
  }) => Promise<{ text: string }>;
  setSessionTitle: (sessionId: string, title: string) => void;
};

/**
 * Requests a title after a chat reply is stored and keeps the placeholder
 * when either title model fails or returns no usable title.
 */
export async function requestChatSessionTitle(
  options: Readonly<RequestChatSessionTitleOptions>,
): Promise<void> {
  try {
    const messages = buildChatTitleMessages(options);
    const reply = options.isOffline
      ? (
          await options.completeOffline({
            modelId: LocalChatModel.OFFLINE_BUNDLE.answer,
            messages,
            maxTokens: 32,
            temperature: 0,
          })
        ).text
      : (
          await options.post({
            route: "chat/:workspaceId/title/:promptId",
            pathParams: {
              workspaceId: options.workspaceId,
              promptId: CHAT_TITLE_PROMPT_ID,
            },
            body: {
              excerpt: options.excerpt,
              locale: options.locale,
              placeholder: options.placeholder,
            },
          })
        ).title;
    const title = parseChatTitleReply(reply, options.placeholder);
    if (title) {
      options.setSessionTitle(options.sessionId, title);
    }
  } catch {
    return;
  }
}
