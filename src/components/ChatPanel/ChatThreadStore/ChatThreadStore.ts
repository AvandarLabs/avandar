import { prop } from "@avandar/utils";
import { ChatViewEvent } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";
import type { ThreadMessageLike } from "@assistant-ui/react";

type StoredThread = {
  messages: ThreadMessageLike[];
};

type ChatThreadIdentity = {
  workspaceId: string;
  userId: string;
};

function _messageText(message: ThreadMessageLike): string {
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

function _isViewChangeMessage(message: ThreadMessageLike): boolean {
  if (ChatViewEvent.isInternal(message.metadata)) {
    return true;
  }
  return ChatViewEvent.isViewChangeContent(_messageText(message));
}

function _stripTrailingViewEvents(
  messages: readonly ThreadMessageLike[],
): ThreadMessageLike[] {
  const lastCommittedIndex = messages.findLastIndex((message) => {
    return !_isViewChangeMessage(message);
  });
  return lastCommittedIndex < 0 ?
      []
    : [...messages.slice(0, lastCommittedIndex + 1)];
}

function _hasIdentity(options: Readonly<ChatThreadIdentity>): boolean {
  return options.workspaceId.length > 0 && options.userId.length > 0;
}

/**
 * Persists the live chat thread per workspace and user in localStorage.
 */
export const ChatThreadStore = {
  /** Builds the localStorage key for a workspace-user thread slot. */
  storageKey: (options: Readonly<ChatThreadIdentity>): string => {
    return `ava.chat.thread.${options.workspaceId}.${options.userId}`;
  },

  /**
   * Reads committed thread messages, or an empty array when missing or
   * invalid.
   */
  read: (options: Readonly<ChatThreadIdentity>): ThreadMessageLike[] => {
    if (!_hasIdentity(options)) {
      return [];
    }
    try {
      const raw = window.localStorage.getItem(
        ChatThreadStore.storageKey(options),
      );
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("messages" in parsed) ||
        !Array.isArray((parsed as StoredThread).messages)
      ) {
        return [];
      }
      return (parsed as StoredThread).messages;
    } catch {
      return [];
    }
  },

  /**
   * Persists committed thread messages, omitting a trailing pending view
   * change.
   */
  write: (
    options: Readonly<
      ChatThreadIdentity & { messages: readonly ThreadMessageLike[] }
    >,
  ): void => {
    if (!_hasIdentity(options)) {
      return;
    }
    const committed = _stripTrailingViewEvents(options.messages);
    try {
      window.localStorage.setItem(
        ChatThreadStore.storageKey(options),
        JSON.stringify({ messages: committed } satisfies StoredThread),
      );
    } catch {
      // Private browsing or quota exceeded: in-memory only for this session.
    }
  },

  /** Removes the persisted thread slot for a workspace and user. */
  clear: (options: Readonly<ChatThreadIdentity>): void => {
    if (!_hasIdentity(options)) {
      return;
    }
    try {
      window.localStorage.removeItem(ChatThreadStore.storageKey(options));
    } catch {
      // Storage unavailable: nothing to clear.
    }
  },
};
