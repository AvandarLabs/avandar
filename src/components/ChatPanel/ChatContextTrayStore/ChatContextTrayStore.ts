import { MAX_ATTACHED_GADGETS } from "$/agent/mentions/AgentGadgetContext";
import { isChatMentionType } from "$/agent/mentions/ChatMentionToken";
import { isGadgetRef } from "$/models/gadgets/Gadget/Gadget";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";

type ChatTrayIdentity = { workspaceId: string; userId: string };

function _hasIdentity(options: Readonly<ChatTrayIdentity>): boolean {
  return options.workspaceId.length > 0 && options.userId.length > 0;
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
 * Persists the chat's context tray per workspace and user in localStorage,
 * beside the thread `ChatThreadStore` keeps. Stores refs only, never names.
 * Reading drops anything that is not a chat mention ref and keeps at most
 * five.
 */
export const ChatContextTrayStore = {
  storageKey: (options: Readonly<ChatTrayIdentity>): string => {
    return `ava.chat.context.${options.workspaceId}.${options.userId}`;
  },

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

  write: (
    options: Readonly<ChatTrayIdentity & { refs: readonly Gadget.Ref[] }>,
  ): void => {
    if (!_hasIdentity(options)) {
      return;
    }
    try {
      window.localStorage.setItem(
        ChatContextTrayStore.storageKey(options),
        JSON.stringify({ refs: options.refs.map(_toPlainRef) }),
      );
    } catch {
      // Private browsing or quota exceeded: in memory only for this session.
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
};
