import { prop } from "@avandar/utils";
import { ChatViewEvent } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";
import type {
  ChatClarifyRequest,
  ChatProposedCaseType,
} from "$/types/chat.types";
import type { ThreadMessageLike } from "@assistant-ui/react";

/**
 * Workspace, user, and optional session that identify a persisted chat
 * thread slot. `ChatThreadStore` uses this to pick the localStorage key.
 */
export type ChatThreadIdentity = {
  workspaceId: string;
  userId: string;
  sessionId?: string;
};

/**
 * A clarification card stored on the thread, including the optional
 * audit id the UI uses to correlate the answer.
 */
export type StoredPendingClarification = ChatClarifyRequest & {
  auditId?: string;
};

/**
 * The persisted chat thread blob: committed messages plus any pending
 * clarification or case-type draft cards.
 */
export type StoredChatThread = {
  messages: ThreadMessageLike[];
  pendingClarification?: StoredPendingClarification;
  pendingCaseTypeDraft?: ChatProposedCaseType;
};

type WriteRecordOptions = ChatThreadIdentity & {
  messages: readonly ThreadMessageLike[];
  pendingClarification?: StoredPendingClarification;
  pendingCaseTypeDraft?: ChatProposedCaseType;
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
  return lastCommittedIndex < 0
    ? []
    : [...messages.slice(0, lastCommittedIndex + 1)];
}

function _hasIdentity(options: Readonly<ChatThreadIdentity>): boolean {
  return options.workspaceId.length > 0 && options.userId.length > 0;
}

function _storageKey(options: Readonly<ChatThreadIdentity>): string {
  const base = `ava.chat.thread.${options.workspaceId}.${options.userId}`;
  return options.sessionId ? `${base}.${options.sessionId}` : base;
}

function _isNonNullObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function _parseStoredThread(parsed: unknown): StoredChatThread {
  if (!_isNonNullObject(parsed) || !Array.isArray(parsed.messages)) {
    return { messages: [] };
  }
  const record: StoredChatThread = {
    // JSON.parse cannot prove ThreadMessageLike[]; array-ness is checked.
    messages: parsed.messages as ThreadMessageLike[],
  };
  if (_isNonNullObject(parsed.pendingClarification)) {
    record.pendingClarification =
      parsed.pendingClarification as StoredPendingClarification;
  }
  if (_isNonNullObject(parsed.pendingCaseTypeDraft)) {
    record.pendingCaseTypeDraft =
      parsed.pendingCaseTypeDraft as ChatProposedCaseType;
  }
  return record;
}

/**
 * Persists the live chat thread in localStorage, keyed by workspace, user,
 * and optional session. `useAvandarChatRuntime` reads and writes the
 * unscoped slot; `readRecord` and `writeRecord` keep pending cards on the
 * same blob as the messages.
 */
export const ChatThreadStore = {
  /**
   * Builds the unscoped localStorage key for a workspace-user thread slot,
   * without a session id. `readLegacy` and `clearLegacy` use this key.
   */
  legacyStorageKey: (options: Readonly<ChatThreadIdentity>): string => {
    return _storageKey({
      workspaceId: options.workspaceId,
      userId: options.userId,
    });
  },

  /**
   * Reads the persisted thread record, or `{ messages: [] }` when the slot
   * is missing or invalid. Copies pending cards only when each is a
   * non-null object.
   */
  readRecord: (options: Readonly<ChatThreadIdentity>): StoredChatThread => {
    if (!_hasIdentity(options)) {
      return { messages: [] };
    }
    try {
      const raw = window.localStorage.getItem(_storageKey(options));
      if (!raw) {
        return { messages: [] };
      }
      return _parseStoredThread(JSON.parse(raw));
    } catch {
      return { messages: [] };
    }
  },

  /**
   * Persists a thread record, omitting a trailing pending view change.
   * Returns false when storage refuses the write, leaving the previous
   * record in place.
   */
  writeRecord: (options: Readonly<WriteRecordOptions>): boolean => {
    if (!_hasIdentity(options)) {
      return false;
    }
    const committed = _stripTrailingViewEvents(options.messages);
    try {
      window.localStorage.setItem(
        _storageKey(options),
        JSON.stringify({
          messages: committed,
          pendingClarification: options.pendingClarification,
          pendingCaseTypeDraft: options.pendingCaseTypeDraft,
        } satisfies StoredChatThread),
      );
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Reads committed thread messages, or an empty array when missing or
   * invalid.
   */
  read: (options: Readonly<ChatThreadIdentity>): ThreadMessageLike[] => {
    return ChatThreadStore.readRecord(options).messages;
  },

  /**
   * Persists committed thread messages, omitting a trailing pending view
   * change. Leaves any stored pending cards in place.
   */
  write: (
    options: Readonly<
      ChatThreadIdentity & { messages: readonly ThreadMessageLike[] }
    >,
  ): void => {
    if (!_hasIdentity(options)) {
      return;
    }
    const current = ChatThreadStore.readRecord(options);
    ChatThreadStore.writeRecord({
      ...options,
      pendingClarification: current.pendingClarification,
      pendingCaseTypeDraft: current.pendingCaseTypeDraft,
    });
  },

  /**
   * Reads the unscoped thread record the live chat still uses, ignoring
   * any session id on `options`.
   */
  readLegacy: (options: Readonly<ChatThreadIdentity>): StoredChatThread => {
    return ChatThreadStore.readRecord({
      workspaceId: options.workspaceId,
      userId: options.userId,
    });
  },

  /** Removes the persisted thread slot for the given identity. */
  clear: (options: Readonly<ChatThreadIdentity>): void => {
    if (!_hasIdentity(options)) {
      return;
    }
    try {
      window.localStorage.removeItem(_storageKey(options));
    } catch {
      // Storage unavailable: nothing to clear.
    }
  },

  /**
   * Removes the unscoped thread slot the live chat still uses, ignoring
   * any session id on `options`.
   */
  clearLegacy: (options: Readonly<ChatThreadIdentity>): void => {
    ChatThreadStore.clear({
      workspaceId: options.workspaceId,
      userId: options.userId,
    });
  },
};
