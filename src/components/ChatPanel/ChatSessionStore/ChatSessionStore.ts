import { ChatContextTrayStore } from "@/components/ChatPanel/ChatContextTrayStore/ChatContextTrayStore";
import {
  addChatSession,
  archiveChatSession,
  createChatSessionIndex,
  deleteArchivedChatSession,
  parseChatSessionIndex,
} from "@/components/ChatPanel/ChatSessionIndex/ChatSessionIndex";
import { ChatThreadStore } from "@/components/ChatPanel/ChatThreadStore/ChatThreadStore";
import type { ChatSessionIndex } from "@/components/ChatPanel/ChatSessionIndex/ChatSessionIndex";

type ChatSessionIdentity = {
  workspaceId: string;
  userId: string;
};

function _hasIdentity(identity: Readonly<ChatSessionIdentity>): boolean {
  return identity.workspaceId.length > 0 && identity.userId.length > 0;
}

function _storageKey(identity: Readonly<ChatSessionIdentity>): string {
  return `ava.chat.sessions.${identity.workspaceId}.${identity.userId}`;
}

function _writeIndex(
  identity: Readonly<ChatSessionIdentity>,
  index: Readonly<ChatSessionIndex>,
): boolean {
  if (!_hasIdentity(identity)) {
    return false;
  }
  try {
    window.localStorage.setItem(_storageKey(identity), JSON.stringify(index));
    return true;
  } catch {
    return false;
  }
}

function _createDataIndex(): ChatSessionIndex {
  return createChatSessionIndex({
    id: crypto.randomUUID(),
    kind: "data",
  });
}

function _parseStoredIndex(raw: string): ChatSessionIndex | undefined {
  try {
    return parseChatSessionIndex(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function _clearSession(
  identity: Readonly<ChatSessionIdentity>,
  sessionId: string,
): void {
  ChatThreadStore.clear({ ...identity, sessionId });
  ChatContextTrayStore.clear({ ...identity, sessionId });
}

function _migrateLegacyChat(
  identity: Readonly<ChatSessionIdentity>,
): ChatSessionIndex {
  const index = _createDataIndex();
  const legacyThread = ChatThreadStore.readLegacy(identity);
  const legacyRefs = ChatContextTrayStore.readLegacy(identity);
  const threadDidWrite = ChatThreadStore.writeRecord({
    ...identity,
    sessionId: index.selectedId,
    ...legacyThread,
  });
  const trayDidWrite =
    legacyRefs.length === 0 ||
    ChatContextTrayStore.write({
      ...identity,
      sessionId: index.selectedId,
      refs: legacyRefs,
    });
  const indexDidWrite = _writeIndex(identity, index);
  if (threadDidWrite && trayDidWrite && indexDidWrite) {
    ChatThreadStore.clearLegacy(identity);
    ChatContextTrayStore.clearLegacy(identity);
  } else {
    _clearSession(identity, index.selectedId);
  }
  return index;
}

/**
 * Loads a workspace-user session index, migrating the pre-session chat when
 * no index exists and creating an open data session when needed.
 */
export function loadChatSessions(
  identity: Readonly<ChatSessionIdentity>,
): ChatSessionIndex {
  if (!_hasIdentity(identity)) {
    return createChatSessionIndex({ id: "local", kind: "data" });
  }
  const raw = window.localStorage.getItem(_storageKey(identity));
  if (raw === null) {
    return _migrateLegacyChat(identity);
  }
  const parsed = _parseStoredIndex(raw);
  if (!parsed) {
    const index = _createDataIndex();
    _writeIndex(identity, index);
    return index;
  }
  if (parsed.openIds.length > 0) {
    return parsed;
  }
  const index = addChatSession(parsed, {
    id: crypto.randomUUID(),
    kind: "data",
  });
  _writeIndex(identity, index);
  return index;
}

/**
 * Archives a session, persists its replacement index, and removes any
 * archived session evicted by the cap after that write succeeds.
 */
export function archiveStoredChatSession(
  identity: Readonly<ChatSessionIdentity>,
  index: Readonly<ChatSessionIndex>,
  sessionId: string,
): ChatSessionIndex {
  const result = archiveChatSession(index, {
    sessionId,
    replacementId: crypto.randomUUID(),
  });
  const indexDidWrite = _writeIndex(identity, result.index);
  if (indexDidWrite && result.evictedSessionId) {
    _clearSession(identity, result.evictedSessionId);
  }
  return result.index;
}

/** Persists an already-updated session index and returns it unchanged. */
export function commitChatSessionIndex(
  identity: Readonly<ChatSessionIdentity>,
  index: Readonly<ChatSessionIndex>,
): ChatSessionIndex {
  _writeIndex(identity, index);
  return index;
}

/**
 * Deletes an archived session from the index and clears its stored thread
 * and tray only after the updated index is persisted.
 */
export function deleteStoredChatSession(
  identity: Readonly<ChatSessionIdentity>,
  index: Readonly<ChatSessionIndex>,
  sessionId: string,
): ChatSessionIndex {
  const nextIndex = deleteArchivedChatSession(index, sessionId);
  const indexDidWrite = _writeIndex(identity, nextIndex);
  if (indexDidWrite && index.archivedIds.includes(sessionId)) {
    _clearSession(identity, sessionId);
  }
  return nextIndex;
}
