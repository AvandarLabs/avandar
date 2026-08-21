import type { ThreadMessageLike } from "@assistant-ui/react";

type ThreadMessageSource = {
  id: string;
  role: ThreadMessageLike["role"];
  content: ThreadMessageLike["content"];
  metadata?: {
    custom?: Record<string, unknown>;
  };
};

/**
 * Converts a live thread message into a reset-safe like, copying custom
 * metadata so hidden view and discovery flags survive.
 */
export function makeLikeFromThreadMessage(
  message: Readonly<ThreadMessageSource>,
): ThreadMessageLike {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    metadata: {
      custom: { ...(message.metadata?.custom ?? {}) },
    },
  };
}

/**
 * Converts live thread messages into likes for a thread reset.
 */
export function makeLikesFromThreadMessages(
  messages: readonly ThreadMessageSource[],
): ThreadMessageLike[] {
  return messages.map(makeLikeFromThreadMessage);
}
