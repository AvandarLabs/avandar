import { ChatViewEvent } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { ChatViewSnapshot } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";
import type { ThreadMessageLike } from "@assistant-ui/react";

/**
 * Builds a thread with the page snapshot represented as a view-change message.
 * Use it, for example, when starting a chat thread from the current page
 * context.
 */
export function makeThreadMessagesFromSnapshot(
  options: Readonly<{
    messages: readonly ThreadMessageLike[];
    snapshot: Readonly<ChatViewSnapshot>;
  }>,
): ThreadMessageLike[] {
  return ChatViewEvent.applyToMessages(options);
}

/**
 * Returns an empty thread plus one pending view-change message for the given
 * page context and pathname.
 */
export function makeNewChatThreadMessagesFromPageContext(
  options: Readonly<{
    pageContext: Readonly<
      Pick<ChatPageContext.T, "app" | "openDatasetId" | "dashboardId">
    >;
    pathname: string;
  }>,
): ThreadMessageLike[] {
  return makeThreadMessagesFromSnapshot({
    messages: [],
    snapshot: ChatViewEvent.makeSnapshotFromPageContext({
      pageContext: options.pageContext,
      route: options.pathname,
    }),
  });
}
