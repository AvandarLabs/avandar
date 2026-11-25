/** How many open sessions the tab strip shows. */
export const VISIBLE_OPEN_SESSIONS = 3;

/** How many closed sessions the archive keeps. Newest first. */
export const ARCHIVE_LIMIT = 50;

/** Which composer and which reply path a session uses. */
export type ChatSessionKind = "data" | "case-design";

/**
 * One session's row in the index. The title is absent while it is still a
 * placeholder, so the component can translate "New chat" and "New case type".
 */
export type ChatSessionMeta = {
  id: string;
  kind: ChatSessionKind;
  title?: string;
  titleIsPlaceholder: boolean;
};

/** Open order, archive order, and the selected session. No messages. */
export type ChatSessionIndex = {
  selectedId: string;
  openIds: readonly string[];
  archivedIds: readonly string[];
  sessions: Readonly<Record<string, ChatSessionMeta>>;
};

/** What archiving removed when the archive was already full. */
export type ArchiveChatSessionResult = {
  index: ChatSessionIndex;
  evictedSessionId?: string;
};

function _meta(options: {
  id: string;
  kind: ChatSessionKind;
}): ChatSessionMeta {
  return {
    id: options.id,
    kind: options.kind,
    titleIsPlaceholder: true,
  };
}

/** One open session, selected. */
export function createChatSessionIndex(options: {
  id: string;
  kind: ChatSessionKind;
}): ChatSessionIndex {
  return {
    selectedId: options.id,
    openIds: [options.id],
    archivedIds: [],
    sessions: { [options.id]: _meta(options) },
  };
}

/** Puts a session at the front of the open order and selects it. */
export function addChatSession(
  index: ChatSessionIndex,
  options: { id: string; kind: ChatSessionKind },
): ChatSessionIndex {
  return {
    ...index,
    selectedId: options.id,
    openIds: [
      options.id,
      ...index.openIds.filter((id) => {
        return id !== options.id;
      }),
    ],
    archivedIds: index.archivedIds.filter((id) => {
      return id !== options.id;
    }),
    sessions: { ...index.sessions, [options.id]: _meta(options) },
  };
}

/**
 * Selects an open session. An overflow id is moved to the front. An archived
 * id is left alone.
 */
export function selectChatSession(
  index: ChatSessionIndex,
  sessionId: string,
): ChatSessionIndex {
  const openPosition = index.openIds.indexOf(sessionId);
  if (openPosition < 0) {
    return index;
  }
  if (openPosition < VISIBLE_OPEN_SESSIONS) {
    return { ...index, selectedId: sessionId };
  }
  return {
    ...index,
    selectedId: sessionId,
    openIds: [
      sessionId,
      ...index.openIds.filter((id) => {
        return id !== sessionId;
      }),
    ],
  };
}

function _evictOldest(
  archivedIds: readonly string[],
  sessions: Readonly<Record<string, ChatSessionMeta>>,
): {
  archivedIds: readonly string[];
  sessions: Readonly<Record<string, ChatSessionMeta>>;
  evictedSessionId?: string;
} {
  if (archivedIds.length <= ARCHIVE_LIMIT) {
    return { archivedIds, sessions };
  }
  const evictedSessionId = archivedIds[archivedIds.length - 1];
  if (!evictedSessionId) {
    return { archivedIds, sessions };
  }
  const nextSessions = { ...sessions };
  delete nextSessions[evictedSessionId];
  return {
    archivedIds: archivedIds.slice(0, ARCHIVE_LIMIT),
    sessions: nextSessions,
    evictedSessionId,
  };
}

/** Moves an open session to the front of the archive. */
export function archiveChatSession(
  index: ChatSessionIndex,
  options: { sessionId: string; replacementId: string },
): ArchiveChatSessionResult {
  if (!index.openIds.includes(options.sessionId)) {
    return { index };
  }
  const openIds = index.openIds.filter((id) => {
    return id !== options.sessionId;
  });
  const evicted = _evictOldest(
    [
      options.sessionId,
      ...index.archivedIds.filter((id) => {
        return id !== options.sessionId;
      }),
    ],
    index.sessions,
  );
  const wasSelected = index.selectedId === options.sessionId;
  const closed: ChatSessionIndex = {
    ...index,
    openIds,
    archivedIds: evicted.archivedIds,
    sessions: evicted.sessions,
    selectedId: wasSelected
      ? (openIds[0] ?? options.replacementId)
      : index.selectedId,
  };
  const next =
    openIds.length > 0
      ? selectChatSession(closed, closed.selectedId)
      : addChatSession(closed, { id: options.replacementId, kind: "data" });
  return { index: next, evictedSessionId: evicted.evictedSessionId };
}

/** Moves an archived session to the front of the open order and selects it. */
export function reopenChatSession(
  index: ChatSessionIndex,
  sessionId: string,
): ChatSessionIndex {
  if (!index.archivedIds.includes(sessionId) || !index.sessions[sessionId]) {
    return index;
  }
  return selectChatSession(
    {
      ...index,
      archivedIds: index.archivedIds.filter((id) => {
        return id !== sessionId;
      }),
      openIds: [sessionId, ...index.openIds],
    },
    sessionId,
  );
}

/** Removes an archived session from the index. An open id is left alone. */
export function deleteArchivedChatSession(
  index: ChatSessionIndex,
  sessionId: string,
): ChatSessionIndex {
  if (!index.archivedIds.includes(sessionId)) {
    return index;
  }
  const sessions = { ...index.sessions };
  delete sessions[sessionId];
  return {
    ...index,
    archivedIds: index.archivedIds.filter((id) => {
      return id !== sessionId;
    }),
    sessions,
  };
}

/** Stores a title and clears the placeholder flag. A blank title is ignored. */
export function setChatSessionTitle(
  index: ChatSessionIndex,
  options: { sessionId: string; title: string },
): ChatSessionIndex {
  const current = index.sessions[options.sessionId];
  const title = options.title.trim();
  if (!current || title.length === 0) {
    return index;
  }
  return {
    ...index,
    sessions: {
      ...index.sessions,
      [options.sessionId]: { ...current, title, titleIsPlaceholder: false },
    },
  };
}

/** The sessions the strip shows. */
export function visibleOpenIds(index: ChatSessionIndex): readonly string[] {
  return index.openIds.slice(0, VISIBLE_OPEN_SESSIONS);
}

/** Open sessions that do not fit on the strip. */
export function overflowOpenIds(index: ChatSessionIndex): readonly string[] {
  return index.openIds.slice(VISIBLE_OPEN_SESSIONS);
}

function _readMeta(value: unknown): ChatSessionMeta | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const { id, kind, title, titleIsPlaceholder } = record;
  if (typeof id !== "string" || id.length === 0) {
    return undefined;
  }
  if (kind !== "data" && kind !== "case-design") {
    return undefined;
  }
  if (typeof titleIsPlaceholder !== "boolean") {
    return undefined;
  }
  if (title !== undefined && typeof title !== "string") {
    return undefined;
  }
  if (
    !titleIsPlaceholder &&
    (typeof title !== "string" || title.length === 0)
  ) {
    return undefined;
  }
  return typeof title === "string"
    ? { id, kind, title, titleIsPlaceholder }
    : { id, kind, titleIsPlaceholder };
}

function _stringIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => {
        return typeof item === "string";
      })
    : [];
}

/**
 * Reads an index and drops sessions whose meta is unreadable. Returns
 * undefined when nothing usable remains. An archive with no open session is
 * usable: the caller adds an empty data session.
 */
export function parseChatSessionIndex(
  raw: unknown,
): ChatSessionIndex | undefined {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const sessions: Record<string, ChatSessionMeta> = {};
  if (typeof record.sessions === "object" && record.sessions !== null) {
    for (const value of Object.values(record.sessions)) {
      const meta = _readMeta(value);
      if (meta) {
        sessions[meta.id] = meta;
      }
    }
  }
  const openIds = _stringIds(record.openIds).filter((id) => {
    return sessions[id];
  });
  const archivedIds = _stringIds(record.archivedIds).filter((id) => {
    return Boolean(sessions[id]) && !openIds.includes(id);
  });
  if (openIds.length === 0 && archivedIds.length === 0) {
    return undefined;
  }
  if (openIds.length === 0) {
    return { selectedId: "", openIds: [], archivedIds, sessions };
  }
  const requested = record.selectedId;
  const selectedId =
    typeof requested === "string" && openIds.includes(requested)
      ? requested
      : (openIds[0] ?? "");
  return selectChatSession(
    { selectedId, openIds, archivedIds, sessions },
    selectedId,
  );
}
