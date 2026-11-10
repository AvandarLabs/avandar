import { MAX_ATTACHED_GADGETS } from "$/agent/mentions/AgentGadgetContext";
import { isChatMentionType } from "$/agent/mentions/ChatMentionToken";
import { isGadgetRef } from "$/models/gadgets/Gadget/Gadget";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";

type ChatTrayIdentity = {
  workspaceId: string;
  userId: string;
  sessionId?: string;
};

function _hasIdentity(options: Readonly<ChatTrayIdentity>): boolean {
  return options.workspaceId.length > 0 && options.userId.length > 0;
}

function _storageKey(options: Readonly<ChatTrayIdentity>): string {
  const { workspaceId, userId, sessionId } = options;
  if (!sessionId) {
    return `ava.chat.context.${workspaceId}.${userId}`;
  }
  return `ava.chat.tray.${workspaceId}.${userId}.${sessionId}`;
}

function _isTrayRef(value: unknown): value is Gadget.Ref {
  return isGadgetRef(value) && isChatMentionType(value.gadgetType);
}

/** Copies a ref to a plain object so no extra field is ever stored. */
function _toPlainRef(ref: Gadget.Ref): Gadget.Ref {
  return {
    gadgetType: ref.gadgetType,
    gadgetId: ref.gadgetId,
    subId: ref.subId,
  };
}

function _refsFromStored(raw: string | null): Gadget.Ref[] {
  const parsed: unknown = raw ? JSON.parse(raw) : undefined;
  const refs: unknown =
    typeof parsed === "object" && parsed !== null && "refs" in parsed
      ? parsed.refs
      : [];
  return Array.isArray(refs)
    ? refs.filter(_isTrayRef).slice(0, MAX_ATTACHED_GADGETS).map(_toPlainRef)
    : [];
}

/**
 * Persists the chat's context tray per workspace, user, and optional
 * session in localStorage, beside the thread `ChatThreadStore` keeps.
 * Stores refs only, never names. Reading drops anything that is not a
 * chat mention ref and keeps at most five. A call with no session id
 * uses the workspace-and-user key.
 */
export const ChatContextTrayStore = {
  storageKey: _storageKey,

  read: (options: Readonly<ChatTrayIdentity>): Gadget.Ref[] => {
    if (!_hasIdentity(options)) {
      return [];
    }
    try {
      return _refsFromStored(
        window.localStorage.getItem(ChatContextTrayStore.storageKey(options)),
      );
    } catch {
      return [];
    }
  },

  /**
   * Reads the workspace-and-user tray, ignoring any session id. Callers
   * use it to load the slot `read` uses when no session is given.
   */
  readLegacy: (options: Readonly<ChatTrayIdentity>): Gadget.Ref[] => {
    const { workspaceId, userId } = options;
    return ChatContextTrayStore.read({ workspaceId, userId });
  },

  write: (
    options: Readonly<ChatTrayIdentity & { refs: readonly Gadget.Ref[] }>,
  ): boolean => {
    if (!_hasIdentity(options)) {
      return false;
    }
    try {
      window.localStorage.setItem(
        ChatContextTrayStore.storageKey(options),
        JSON.stringify({ refs: options.refs.map(_toPlainRef) }),
      );
      return true;
    } catch {
      // Private browsing or quota exceeded: in memory only for this session.
      return false;
    }
  },

  clear: (options: Readonly<ChatTrayIdentity>): void => {
    if (!_hasIdentity(options)) {
      return;
    }
    try {
      window.localStorage.removeItem(ChatContextTrayStore.storageKey(options));
    } catch {
      // Storage unavailable: nothing to clear.
    }
  },

  /**
   * Clears the workspace-and-user tray, ignoring any session id. Callers
   * use it to discard the slot `clear` uses when no session is given.
   */
  clearLegacy: (options: Readonly<ChatTrayIdentity>): void => {
    const { workspaceId, userId } = options;
    ChatContextTrayStore.clear({ workspaceId, userId });
  },
};
