import { prop } from "@avandar/utils";
import { ChatViewEvent } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";
import { DiscoveryContinuationMessage } from "@/components/ChatPanel/DiscoveryContinuationMessage/DiscoveryContinuationMessage";
import type { ThreadMessageLike } from "@assistant-ui/react";

type ThreadMessageSource = {
  content?: ThreadMessageLike["content"];
  metadata?: {
    custom?: Record<string, unknown>;
  };
};

function _messageText(message: Readonly<ThreadMessageSource>): string {
  if (message.content === undefined) {
    return "";
  }
  if (typeof message.content === "string") {
    return message.content;
  }
  return message.content
    .filter((part): part is { type: "text"; text: string } => {
      return part.type === "text";
    })
    .map(prop("text"))
    .join("\n");
}

/**
 * Returns whether a thread message is hidden from the transcript (view
 * events and discovery continuations).
 */
export function isHiddenChatThreadMessage(
  message: Readonly<ThreadMessageSource>,
): boolean {
  if (DiscoveryContinuationMessage.isInternal(message.metadata)) {
    return true;
  }
  if (ChatViewEvent.isInternal(message.metadata)) {
    return true;
  }
  return ChatViewEvent.isViewChangeContent(_messageText(message));
}
