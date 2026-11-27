# Phase 1C: Multiple chats and an archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The user keeps more than one chat in this browser, returns to the session that was selected when the panel last closed, and can reopen or delete a closed session from an archive.

**Architecture:** A pure session index orders the open sessions and the archive. `localStorage` keeps one thread record and one tray record per session, plus one index record per workspace and user. The panel's open flag and its docked or expanded layout stay where they are today, on `ChatPanelStateManager`. One Assistant UI runtime is mounted. Switching sessions writes the current thread, pending cards, and tray, then loads the next session into that runtime. A title is requested after a reply is stored, and it never joins the data-agent prompt.

**Tech Stack:** TypeScript, React 19, Mantine 9, assistant-ui, Vitest, Playwright, Lingui, the `chat` edge function's OpenRouter call.

**Spec:** [../specs/phase-1c.md](../specs/phase-1c.md). Decision D43 in [../decisions.md](../decisions.md). Rules R1 to R4 in [../specs/phase-1.md](../specs/phase-1.md).

This plan lives beside the Phase 1A and Phase 1B plans. That location overrides the writing-plans default of `docs/superpowers/plans/`.

---

## Before you start

- Work in `~/src/worktrees/avandar/feat/agent-sessions` (branch `feat/agent-sessions`). Commit as you go. Never push or merge.
- Read `CLAUDE.md`, `docs/rules/typescript.md`, `docs/rules/testing.md`, `docs/rules/i18n.md`, and the spec.
- Formatting: `pnpm exec oxfmt --ignore-path .oxfmtignore <files>`, then `pnpm exec eslint --fix <files>`. ESLint wants 80-character lines and block-bodied arrow functions. Functions stay at 45 lines or fewer.
- Files under `shared/` import each other with `$/...` and a `.ts` extension, and never import from `src/`.
- Run one test file with `pnpm vitest run <path>`. Type check with `pnpm exec tsc -b --noEmit`. Trust that over editor diagnostics, which can come from other checkouts.
- Every user-facing string goes through Lingui (`t`, `<Trans>`). The title instruction, the offline-answer stand-in, and storage keys are not translated.
- No database command and no e2e run before Task 12. Task 12 starts with `ava supabase status`. If the first line does not name this branch's own project, run `ava supabase switch`, then `pnpm fns:update-env`. Never run those against the shared `avandar` stack.
- A test that passes on its first run is not red/green. Say so in your report when it happens.
- Do not edit `buildDataAgentSystemPrompt`, `DATA_AGENT_PROMPT_ID`, or `buildAgentTurnText`. A data session's turn text stays the text Phase 1B sends.

## Decisions made while planning

| Spec says | Plan does | Why |
|---|---|---|
| Tray key `ava.chat.tray.{workspaceId}.{userId}.{sessionId}` | New sessions use that key. The key today, `ava.chat.context.{workspaceId}.{userId}`, is read only by the first-load migration. | The spec names the new key. The current key has no session id, so it cannot be reused as a per-session key. |
| The selected session is showing when the panel opens | The index stores `selectedId`. Hydration loads that session. Opening the panel does not create a session. | Nux and the header's Chat button only show or hide the panel. |
| **New chat** on the case manager page | The header's **New chat** always adds a data session, including on the case manager page. Only **New case type** adds a case-design session. | The spec says **New case type**, and only that entry point, expands the panel and uses the case-design composer. |
| A case-design session uses today's textarea | The textarea is enabled. A data session on the case manager page uses the agent composer while the agent switch is on. | The old rule disabled the composer on the case designer so the agent editor could not appear there. The session kind now draws that line, so the case-design textarea no longer has to be disabled to keep the agent off it. |
| The composer follows the session, not the page | `createChatModelAdapter` treats a turn as an agent turn when the session kind is `data` and the switch is on. A `case-design` session always goes to today's chat. | The page check `app !== "case-manager"` would keep answering a data session with today's chat after the user navigates to the case manager. |
| A corrupt session is skipped | A session meta that fails to parse is dropped. A thread record that fails to parse loads as an empty thread and the session stays. An index that fails to parse becomes one new empty data session. | Dropping a chat because one message failed `JSON.parse` would delete history the user can still see in memory. |
| A failed `localStorage` write keeps the previous value | Writers return `false` when `setItem` throws. Callers still keep the new index in React state. They delete an evicted session's keys only after the index write returns `true`. | `setItem` throws before it replaces the previous value. Deleting keys first would lose a session the stored index still names. |
| The title model sees the redacted turn | The excerpt is built where the turn already has `conversation.sqlVault.maskText`. Tool-call arguments are left out. | The persist effect does not have the vault. Rebuilding it there would be a second redaction path. |
| Offline titles stay on the device | An offline reply calls `OfflineChatEngineStore.complete` with `LocalChatModel.OFFLINE_BUNDLE.answer`. It does not call the title route. | The store is the on-device model. A hosted title call would send the excerpt out. |
| There is no other AI entry point yet | Do not add one. `startDataSession` does not change layout and does not open the panel. A later entry point calls `dispatch.open()` itself. | R4 is satisfied by the two entry points that exist: **New chat** and **New case type**. Nux only opens the panel. |

## File structure

| File | Responsibility |
|---|---|
| `src/components/ChatPanel/ChatSessionIndex/ChatSessionIndex.ts` (new) | Pure index: add, select, archive, reopen, delete, title, parse. No `localStorage`. |
| `src/components/ChatPanel/ChatSessionIndex/ChatSessionIndex.test.ts` (new) | The index behaviors in the spec. |
| `src/components/ChatPanel/ChatSessionStore/ChatSessionStore.ts` (new) | Index key, migration, and the writes that also delete an evicted session. |
| `src/components/ChatPanel/ChatSessionStore/ChatSessionStore.test.ts` (new) | Migration, the archive cap, and a failed write. |
| `src/components/ChatPanel/ChatThreadStore/ChatThreadStore.ts` | Session id on the key, pending cards on the record, legacy key for migration. |
| `src/components/ChatPanel/ChatContextTrayStore/ChatContextTrayStore.ts` | Session id on the new tray key, legacy key for migration. |
| `src/components/ChatPanel/ChatSessionProvider/ChatSessionProvider.tsx` (new) | React state for the index. The case manager button and the panel both read it. |
| `src/components/ChatPanel/useAvandarChatRuntime/useAvandarChatRuntime.ts` | Load and persist the selected session. Swap threads when `selectedId` changes. |
| `src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter.ts` | Agent routing follows the session kind. |
| `src/components/ChatPanel/ChatThread/Composer/Composer.tsx` | Textarea or agent editor from the session kind and the switch. |
| `src/components/ChatPanel/ChatThread/ChatSessionStrip/ChatSessionStrip.tsx` (new) | Three tabs, the overflow menu, the archive menu. |
| `src/components/ChatPanel/ChatPanel/ChatPanel.tsx` | Drop the nonce effect and the effect that docks on navigation. |
| `src/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager.tsx` | `beginCaseDesign` only opens and expands. The nonce field goes away. |
| `shared/agent/chatTitle/chatTitlePrompt.ts` (new) | Prompt id, the title messages, and the reply parser. Shared by the browser and the edge function. |
| `shared/agent/chatTitle/buildChatSessionTitleExcerpt.ts` (new) | The redacted excerpt. No rows, SQL, or gadget ids. |
| `supabase/functions/chat/PostChatTitle/PostChatTitle.ts` (new) | `POST /:workspaceId/title/:promptId`. The server builds the prompt and calls Haiku 5.5. |
| `tests/e2e/agent-chat-sessions.spec.ts` (new) | The browser spec in the spec's Testing section. |

---

### Task 1: Session index

**Files:**
- Create: `src/components/ChatPanel/ChatSessionIndex/ChatSessionIndex.ts`
- Test: `src/components/ChatPanel/ChatSessionIndex/ChatSessionIndex.test.ts`

The index is a value. It does not read `localStorage`, generate ids, or delete keys. Callers pass ids.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  ARCHIVE_LIMIT,
  VISIBLE_OPEN_SESSIONS,
  addChatSession,
  archiveChatSession,
  createChatSessionIndex,
  deleteArchivedChatSession,
  overflowOpenIds,
  parseChatSessionIndex,
  reopenChatSession,
  selectChatSession,
  setChatSessionTitle,
  visibleOpenIds,
} from "./ChatSessionIndex";

const data = (id: string) => {
  return { id, kind: "data" as const, titleIsPlaceholder: true };
};

describe("ChatSessionIndex", () => {
  it("adds a session at the front and selects it", () => {
    const index = addChatSession(createChatSessionIndex({ id: "a", kind: "data" }), {
      id: "b",
      kind: "case-design",
    });
    expect(index.openIds).toEqual(["b", "a"]);
    expect(index.selectedId).toBe("b");
    expect(index.sessions.b?.kind).toBe("case-design");
    expect(index.sessions.b?.titleIsPlaceholder).toBe(true);
  });

  it("moves an overflow session to the front when it is selected", () => {
    let index = createChatSessionIndex({ id: "a", kind: "data" });
    for (const id of ["b", "c", "d"]) {
      index = addChatSession(index, { id, kind: "data" });
    }
    index = selectChatSession(index, "a");
    expect(index.openIds[0]).toBe("a");
    expect(visibleOpenIds(index)).toEqual(["a", "d", "c"]);
    expect(overflowOpenIds(index)).toEqual(["b"]);
    expect(visibleOpenIds(index)).toHaveLength(VISIBLE_OPEN_SESSIONS);
  });

  it("does not select an archived session", () => {
    const started = createChatSessionIndex({ id: "a", kind: "data" });
    const added = addChatSession(started, { id: "b", kind: "data" });
    const archived = archiveChatSession(added, {
      sessionId: "a",
      replacementId: "unused",
    });
    expect(selectChatSession(archived.index, "a")).toBe(archived.index);
  });

  it("archives a session and selects the new front", () => {
    const index = addChatSession(
      createChatSessionIndex({ id: "a", kind: "data" }),
      { id: "b", kind: "data" },
    );
    const archived = archiveChatSession(index, {
      sessionId: "b",
      replacementId: "unused",
    });
    expect(archived.index.openIds).toEqual(["a"]);
    expect(archived.index.selectedId).toBe("a");
    expect(archived.index.archivedIds).toEqual(["b"]);
    expect(archived.evictedSessionId).toBeUndefined();
  });

  it("starts a new data session when the last open session is archived", () => {
    const index = createChatSessionIndex({ id: "a", kind: "case-design" });
    const archived = archiveChatSession(index, {
      sessionId: "a",
      replacementId: "fresh",
    });
    expect(archived.index.openIds).toEqual(["fresh"]);
    expect(archived.index.selectedId).toBe("fresh");
    expect(archived.index.sessions.fresh?.kind).toBe("data");
    expect(archived.index.archivedIds).toEqual(["a"]);
  });

  it("evicts the oldest archived session past the cap", () => {
    let index = createChatSessionIndex({ id: "open", kind: "data" });
    for (let n = 0; n < ARCHIVE_LIMIT; n += 1) {
      const id = `old-${n}`;
      index = addChatSession(index, { id, kind: "data" });
      index = archiveChatSession(index, {
        sessionId: id,
        replacementId: "unused",
      }).index;
    }
    index = addChatSession(index, { id: "newest", kind: "data" });
    const archived = archiveChatSession(index, {
      sessionId: "newest",
      replacementId: "unused",
    });
    expect(archived.index.archivedIds).toHaveLength(ARCHIVE_LIMIT);
    expect(archived.index.archivedIds[0]).toBe("newest");
    expect(archived.evictedSessionId).toBe("old-0");
    expect(archived.index.sessions["old-0"]).toBeUndefined();
  });

  it("reopens an archived session at the front", () => {
    const archived = archiveChatSession(
      addChatSession(createChatSessionIndex({ id: "a", kind: "data" }), {
        id: "b",
        kind: "data",
      }),
      { sessionId: "a", replacementId: "unused" },
    );
    const reopened = reopenChatSession(archived.index, "a");
    expect(reopened.openIds[0]).toBe("a");
    expect(reopened.selectedId).toBe("a");
    expect(reopened.archivedIds).not.toContain("a");
  });

  it("deletes an archived session and ignores an open one", () => {
    const index = createChatSessionIndex({ id: "open", kind: "data" });
    expect(deleteArchivedChatSession(index, "open")).toBe(index);
    const archived = archiveChatSession(
      addChatSession(index, { id: "closed", kind: "data" }),
      { sessionId: "closed", replacementId: "unused" },
    );
    const deleted = deleteArchivedChatSession(archived.index, "closed");
    expect(deleted.archivedIds).not.toContain("closed");
    expect(deleted.sessions.closed).toBeUndefined();
    expect(deleted.openIds).toContain("open");
  });

  it("stores a generated title and ignores a blank one", () => {
    const index = createChatSessionIndex({ id: "a", kind: "data" });
    expect(setChatSessionTitle(index, { sessionId: "a", title: "   " })).toBe(index);
    const titled = setChatSessionTitle(index, {
      sessionId: "a",
      title: "  Case counts  ",
    });
    expect(titled.sessions.a).toEqual({
      id: "a",
      kind: "data",
      title: "Case counts",
      titleIsPlaceholder: false,
    });
  });

  it("drops a session whose kind is unreadable and selects a remaining one", () => {
    const parsed = parseChatSessionIndex({
      selectedId: "bad",
      openIds: ["bad", "good"],
      archivedIds: ["bad"],
      sessions: {
        bad: { id: "bad", kind: "nope", titleIsPlaceholder: true },
        good: data("good"),
      },
    });
    expect(parsed?.openIds).toEqual(["good"]);
    expect(parsed?.selectedId).toBe("good");
    expect(parsed?.archivedIds).toEqual([]);
  });

  it("returns undefined for an index with nothing usable", () => {
    expect(parseChatSessionIndex("nope")).toBeUndefined();
    expect(parseChatSessionIndex({ openIds: [], sessions: {} })).toBeUndefined();
  });

  it("keeps an archive when no session is open", () => {
    const parsed = parseChatSessionIndex({
      selectedId: "gone",
      openIds: [],
      archivedIds: ["closed"],
      sessions: { closed: data("closed") },
    });
    expect(parsed?.openIds).toEqual([]);
    expect(parsed?.archivedIds).toEqual(["closed"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/components/ChatPanel/ChatSessionIndex/ChatSessionIndex.test.ts`

Expected: FAIL. The module does not exist.

- [ ] **Step 3: Write the index**

```ts
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
    openIds: [options.id, ...index.openIds.filter((id) => id !== options.id)],
    archivedIds: index.archivedIds.filter((id) => id !== options.id),
    sessions: { ...index.sessions, [options.id]: _meta(options) },
  };
}

/** Moves an open session to the front. An archived id is left alone. */
export function selectChatSession(
  index: ChatSessionIndex,
  sessionId: string,
): ChatSessionIndex {
  if (!index.openIds.includes(sessionId)) {
    return index;
  }
  return {
    ...index,
    selectedId: sessionId,
    openIds: [sessionId, ...index.openIds.filter((id) => id !== sessionId)],
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
  const openIds = index.openIds.filter((id) => id !== options.sessionId);
  const evicted = _evictOldest(
    [
      options.sessionId,
      ...index.archivedIds.filter((id) => id !== options.sessionId),
    ],
    index.sessions,
  );
  const closed: ChatSessionIndex = {
    ...index,
    openIds,
    archivedIds: evicted.archivedIds,
    sessions: evicted.sessions,
    selectedId: openIds[0] ?? options.replacementId,
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
      archivedIds: index.archivedIds.filter((id) => id !== sessionId),
      openIds: [...index.openIds, sessionId],
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
    archivedIds: index.archivedIds.filter((id) => id !== sessionId),
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
  if (!titleIsPlaceholder && (typeof title !== "string" || title.length === 0)) {
    return undefined;
  }
  return typeof title === "string"
    ? { id, kind, title, titleIsPlaceholder }
    : { id, kind, titleIsPlaceholder };
}

function _stringIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * Reads an index and drops sessions whose meta is unreadable. Returns
 * undefined when nothing usable remains. An archive with no open session is
 * usable: the caller adds an empty data session.
 */
export function parseChatSessionIndex(raw: unknown): ChatSessionIndex | undefined {
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
  const openIds = _stringIds(record.openIds).filter((id) => sessions[id]);
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/components/ChatPanel/ChatSessionIndex/ChatSessionIndex.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/ChatSessionIndex
git commit -m "$(cat <<'EOF'
feat(chat): add the session index

EOF
)"
```

---

### Task 2: Thread records carry a session id and the pending cards

**Files:**
- Modify: `src/components/ChatPanel/ChatThreadStore/ChatThreadStore.ts`
- Modify: `src/components/ChatPanel/ChatThreadStore/ChatThreadStore.test.ts`

`read` and `write` keep today's signatures, so the runtime still compiles. The new key is used only when `sessionId` is passed. Task 6 makes the runtime pass it. `readLegacy` and `clearLegacy` are the key today's chat already uses.

- [ ] **Step 1: Add the failing tests to `ChatThreadStore.test.ts`**

```ts
it("keeps two sessions' messages apart", () => {
  ChatThreadStore.writeRecord({
    workspaceId: WORKSPACE_ID,
    userId: USER_ID,
    sessionId: "session-a",
    messages: [{ role: "user", content: "alpha" }],
  });
  ChatThreadStore.writeRecord({
    workspaceId: WORKSPACE_ID,
    userId: USER_ID,
    sessionId: "session-b",
    messages: [{ role: "user", content: "beta" }],
  });
  expect(
    ChatThreadStore.readRecord({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      sessionId: "session-a",
    }).messages,
  ).toEqual([{ role: "user", content: "alpha" }]);
});

it("round-trips the pending cards on the thread record", () => {
  const pendingClarification = {
    question: "Which year?",
    responseShape: { kind: "free_text" as const },
    turnNumber: 1 as const,
    auditId: "audit-1",
  };
  const pendingCaseTypeDraft = {
    name: "Measles",
    allowManualCreation: false,
    sourceDatasets: [],
    attributes: [],
    manualEntryAttributes: [],
  };
  ChatThreadStore.writeRecord({
    workspaceId: WORKSPACE_ID,
    userId: USER_ID,
    sessionId: "session-a",
    messages: [{ role: "user", content: "alpha" }],
    pendingClarification,
    pendingCaseTypeDraft,
  });
  expect(
    ChatThreadStore.readRecord({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      sessionId: "session-a",
    }),
  ).toMatchObject({ pendingClarification, pendingCaseTypeDraft });
});

it("leaves the previous record in place when storage refuses the write", () => {
  ChatThreadStore.writeRecord({
    workspaceId: WORKSPACE_ID,
    userId: USER_ID,
    sessionId: "session-a",
    messages: [{ role: "user", content: "kept" }],
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  const wrote = ChatThreadStore.writeRecord({
    workspaceId: WORKSPACE_ID,
    userId: USER_ID,
    sessionId: "session-a",
    messages: [{ role: "user", content: "dropped" }],
  });
  expect(wrote).toBe(false);
  expect(
    ChatThreadStore.readRecord({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      sessionId: "session-a",
    }).messages,
  ).toEqual([{ role: "user", content: "kept" }]);
});
```

Import `vi` from `vitest` in that file. The assertion is that the same objects come back.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/components/ChatPanel/ChatThreadStore/ChatThreadStore.test.ts`

Expected: FAIL. `writeRecord` is not defined.

- [ ] **Step 3: Extend the store**

Add the session id and the cards. Keep `storageKey` without a session id as `legacyStorageKey`, used by `readLegacy` and `clearLegacy`.

```ts
import type {
  ChatClarifyRequest,
  ChatProposedCaseType,
} from "$/types/chat.types";

export type ChatThreadIdentity = {
  workspaceId: string;
  userId: string;
  sessionId?: string;
};

export type StoredPendingClarification = ChatClarifyRequest & {
  auditId?: string;
};

export type StoredChatThread = {
  messages: ThreadMessageLike[];
  pendingClarification?: StoredPendingClarification;
  pendingCaseTypeDraft?: ChatProposedCaseType;
};

function _storageKey(options: Readonly<ChatThreadIdentity>): string {
  const base = `ava.chat.thread.${options.workspaceId}.${options.userId}`;
  return options.sessionId ? `${base}.${options.sessionId}` : base;
}
```

`readRecord` parses `messages` the way `read` does today. It copies `pendingClarification` and `pendingCaseTypeDraft` only when each is a non-null object. Otherwise those fields are absent. A thrown parse returns `{ messages: [] }`.

`writeRecord` strips a trailing view event the way `write` does, writes all three fields, and returns `false` when `setItem` throws. `write` stays as the messages-only caller: it reads the current record and calls `writeRecord` with the stored cards, so a messages-only write does not clear them.

`read` returns `readRecord(...).messages`.

`clear` removes `_storageKey(options)`. `clearLegacy` calls `clear` without a session id.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/components/ChatPanel/ChatThreadStore/ChatThreadStore.test.ts`

Expected: PASS, including the tests that were already in the file. Those still call `read` and `write` without a session id.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/ChatThreadStore
git commit -m "$(cat <<'EOF'
feat(chat): store each thread under a session id

EOF
)"
```

---

### Task 3: Tray records carry a session id

**Files:**
- Modify: `src/components/ChatPanel/ChatContextTrayStore/ChatContextTrayStore.ts`
- Modify: `src/components/ChatPanel/ChatContextTrayStore/ChatContextTrayStore.test.ts`

- [ ] **Step 1: Add the failing tests**

```ts
it("keeps two sessions' trays apart", () => {
  ChatContextTrayStore.write({
    ...IDENTITY,
    sessionId: "session-a",
    refs: [DATASET_REF],
  });
  ChatContextTrayStore.write({
    ...IDENTITY,
    sessionId: "session-b",
    refs: [MAP_REF],
  });
  expect(
    ChatContextTrayStore.read({ ...IDENTITY, sessionId: "session-a" }),
  ).toEqual([DATASET_REF]);
  expect(ChatContextTrayStore.storageKey({
    ...IDENTITY,
    sessionId: "session-a",
  })).toBe(`ava.chat.tray.${IDENTITY.workspaceId}.${IDENTITY.userId}.session-a`);
});

it("reads the tray key this browser used before sessions existed", () => {
  window.localStorage.setItem(
    `ava.chat.context.${IDENTITY.workspaceId}.${IDENTITY.userId}`,
    JSON.stringify({ refs: [DATASET_REF] }),
  );
  expect(ChatContextTrayStore.readLegacy(IDENTITY)).toEqual([DATASET_REF]);
});
```

`MAP_REF` is the map ref already built in that test file. If it is not, use a second dataset ref with a different `gadgetId`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/components/ChatPanel/ChatContextTrayStore/ChatContextTrayStore.test.ts`

Expected: FAIL. `sessionId` is not on the identity, and the key is still `ava.chat.context`.

- [ ] **Step 3: Extend the store**

```ts
type ChatTrayIdentity = {
  workspaceId: string;
  userId: string;
  sessionId?: string;
};

function _storageKey(options: Readonly<ChatTrayIdentity>): string {
  if (!options.sessionId) {
    return `ava.chat.context.${options.workspaceId}.${options.userId}`;
  }
  return `ava.chat.tray.${options.workspaceId}.${options.userId}.${options.sessionId}`;
}
```

`storageKey`, `read`, `write`, and `clear` take the optional `sessionId`. `write` returns `false` when `setItem` throws and `true` otherwise. `readLegacy` is `read` without a session id. `clearLegacy` is `clear` without a session id.

Existing tests call the store without a session id. They must keep passing, because that path is the legacy key.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/components/ChatPanel/ChatContextTrayStore/ChatContextTrayStore.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/ChatContextTrayStore
git commit -m "$(cat <<'EOF'
feat(chat): store each context tray under a session id

EOF
)"
```

---

### Task 4: Load, migrate, and cap the archive

**Files:**
- Create: `src/components/ChatPanel/ChatSessionStore/ChatSessionStore.ts`
- Test: `src/components/ChatPanel/ChatSessionStore/ChatSessionStore.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatContextTrayStore } from "@/components/ChatPanel/ChatContextTrayStore/ChatContextTrayStore";
import { ChatThreadStore } from "@/components/ChatPanel/ChatThreadStore/ChatThreadStore";
import { ARCHIVE_LIMIT } from "@/components/ChatPanel/ChatSessionIndex/ChatSessionIndex";
import {
  archiveStoredChatSession,
  loadChatSessions,
} from "./ChatSessionStore";

const IDENTITY = { workspaceId: "ws-1", userId: "user-1" };
const DATASET_REF = {
  gadgetType: "dataset" as const,
  gadgetId: "11111111-1111-4111-8111-111111111111",
  subId: undefined,
};

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("loadChatSessions", () => {
  it("turns today's thread and tray into one data session", () => {
    ChatThreadStore.write({
      ...IDENTITY,
      messages: [{ role: "user", content: "kept" }],
    });
    ChatContextTrayStore.write({ ...IDENTITY, refs: [DATASET_REF] });
    const index = loadChatSessions(IDENTITY);
    expect(index.openIds).toHaveLength(1);
    expect(index.sessions[index.selectedId]?.kind).toBe("data");
    expect(
      ChatThreadStore.readRecord({
        ...IDENTITY,
        sessionId: index.selectedId,
      }).messages,
    ).toEqual([{ role: "user", content: "kept" }]);
    expect(
      ChatContextTrayStore.read({ ...IDENTITY, sessionId: index.selectedId }),
    ).toEqual([DATASET_REF]);
    expect(ChatThreadStore.read(IDENTITY)).toEqual([]);
    expect(ChatContextTrayStore.readLegacy(IDENTITY)).toEqual([]);
  });

  it("leaves today's keys in place when the new index cannot be stored", () => {
    ChatThreadStore.write({
      ...IDENTITY,
      messages: [{ role: "user", content: "kept" }],
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key) => {
      if (String(key).startsWith("ava.chat.sessions.")) {
        throw new Error("quota");
      }
    });
    const index = loadChatSessions(IDENTITY);
    expect(index.sessions[index.selectedId]?.kind).toBe("data");
    expect(ChatThreadStore.read(IDENTITY)).toEqual([
      { role: "user", content: "kept" },
    ]);
    expect(
      window.localStorage.getItem(
        `ava.chat.sessions.${IDENTITY.workspaceId}.${IDENTITY.userId}`,
      ),
    ).toBeNull();
  });

  it("opens a new data session when the index has only an archive", () => {
    const closed = loadChatSessions(IDENTITY);
    const archived = archiveStoredChatSession(
      IDENTITY,
      closed,
      closed.selectedId,
    );
    const stored = {
      ...archived,
      openIds: [],
      selectedId: "",
    };
    window.localStorage.setItem(
      `ava.chat.sessions.${IDENTITY.workspaceId}.${IDENTITY.userId}`,
      JSON.stringify(stored),
    );
    const loaded = loadChatSessions(IDENTITY);
    expect(loaded.openIds).toHaveLength(1);
    expect(loaded.sessions[loaded.selectedId]?.kind).toBe("data");
    expect(loaded.archivedIds).toEqual(archived.archivedIds);
  });

  it("does not copy today's thread when an index is already stored", () => {
    const first = loadChatSessions(IDENTITY);
    ChatThreadStore.write({
      ...IDENTITY,
      messages: [{ role: "user", content: "legacy" }],
    });
    const second = loadChatSessions(IDENTITY);
    expect(second.selectedId).toBe(first.selectedId);
    expect(ChatThreadStore.read(IDENTITY)).toEqual([
      { role: "user", content: "legacy" },
    ]);
  });
});

describe("archiveStoredChatSession", () => {
  it("deletes the oldest archived thread and tray past the cap", () => {
    let index = loadChatSessions(IDENTITY);
    const oldest = "old-session";
    ChatThreadStore.writeRecord({
      ...IDENTITY,
      sessionId: oldest,
      messages: [{ role: "user", content: "old" }],
    });
    ChatContextTrayStore.write({
      ...IDENTITY,
      sessionId: oldest,
      refs: [DATASET_REF],
    });
    for (let n = 0; n < ARCHIVE_LIMIT; n += 1) {
      const id = n === 0 ? oldest : `closed-${n}`;
      index = {
        ...index,
        archivedIds: [...index.archivedIds, id],
        sessions: {
          ...index.sessions,
          [id]: { id, kind: "data", titleIsPlaceholder: true },
        },
      };
    }
    window.localStorage.setItem(
      `ava.chat.sessions.${IDENTITY.workspaceId}.${IDENTITY.userId}`,
      JSON.stringify(index),
    );
    const next = archiveStoredChatSession(IDENTITY, index, index.selectedId);
    expect(next.archivedIds).toHaveLength(ARCHIVE_LIMIT);
    expect(next.sessions[oldest]).toBeUndefined();
    expect(
      ChatThreadStore.readRecord({ ...IDENTITY, sessionId: oldest }).messages,
    ).toEqual([]);
    expect(
      ChatContextTrayStore.read({ ...IDENTITY, sessionId: oldest }),
    ).toEqual([]);
  });
});
```

The cap test seeds 50 archived ids and then archives the open one, which is the 51st. `old-session` is the last archived id, so it is the oldest.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/components/ChatPanel/ChatSessionStore/ChatSessionStore.test.ts`

Expected: FAIL. The module does not exist.

- [ ] **Step 3: Write the store**

`loadChatSessions(identity)`:

1. If `workspaceId` or `userId` is empty, return `createChatSessionIndex({ id: "local", kind: "data" })` and write nothing.
2. Read `ava.chat.sessions.{workspaceId}.{userId}`.
3. If the key is absent, build an id with `crypto.randomUUID()`, create a data session, copy `ChatThreadStore.readLegacy` and `ChatContextTrayStore.readLegacy` onto that id, and write the index. Clear both legacy keys only when the thread write, the tray write, and the index write all returned `true`. An empty legacy tray counts as a successful tray write and does not call `setItem`. If any write returned `false`, `clear` the new session's thread and tray and leave the legacy keys. Return the in-memory index either way.
4. If the key is present but `parseChatSessionIndex` returns undefined, build a new data session and write it over the key. Do not read the legacy keys. If the write returns `false`, return the in-memory session and leave the stored key.
5. If the parsed index has no open id, `addChatSession` with a new id and kind `data`, preserving `archivedIds`, and write it.

`archiveStoredChatSession(identity, index, sessionId)` calls `archiveChatSession` with a new `crypto.randomUUID()` replacement id. It writes the index. Only when that write returns `true` and `evictedSessionId` is set, it clears that session's thread and tray. It returns the new index either way.

`commitChatSessionIndex(identity, index)` writes the index and returns it. The provider uses this for select, add, reopen, delete, and title. `deleteStoredChatSession` writes the index from `deleteArchivedChatSession`, and only then clears that session's thread and tray.

Writes use `JSON.stringify` on the index and return `false` from a `try/catch` around `setItem`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/components/ChatPanel/ChatSessionStore/ChatSessionStore.test.ts src/components/ChatPanel/ChatSessionIndex/ChatSessionIndex.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/ChatSessionStore
git commit -m "$(cat <<'EOF'
feat(chat): migrate today's chat into the first session

EOF
)"
```

---

### Task 5: Share the index with the panel and the case manager

**Files:**
- Create: `src/components/ChatPanel/ChatSessionProvider/ChatSessionProvider.tsx`
- Create: `src/components/ChatPanel/ChatSessionProvider/useChatSessions.ts`
- Modify: `src/components/ChatPanel/ChatPanelProvider/ChatPanelProvider.tsx`
- Test: `src/components/ChatPanel/ChatSessionProvider/ChatSessionProvider.test.tsx`

The runtime is mounted inside the panel. **New case type** is mounted on the case manager page. Both sit under `ChatPanelProvider`, so the index has to live there.

- [ ] **Step 1: Write the failing test**

Render `ChatSessionProvider` under a workspace and user (use the same harness the chat runtime tests use, or mock `useCurrentWorkspace` and `useCurrentUser` to return `{ id: "ws-1" }` and `{ id: "user-1" }`). Seed a legacy thread `{ role: "user", content: "kept" }`. Render a consumer that prints `index.selectedId` and the selected session's kind.

Assert the kind is `data` and `ChatThreadStore.readRecord` for that id returns the legacy message.

Click a button that calls `startDataSession`. Assert `openIds[0]` is the new id, the previous id is still in `openIds`, and `layout` was not read or changed. The provider does not touch layout. Assert that with a second button that calls `archiveSession` on the last remaining open id after archiving down to one, a new data session is selected.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/components/ChatPanel/ChatSessionProvider/ChatSessionProvider.test.tsx`

Expected: FAIL. The provider does not exist.

- [ ] **Step 3: Write the provider**

`ChatSessionProvider` calls `useCurrentWorkspace` and `useCurrentUser`. On the first render where both ids are non-empty, it calls `loadChatSessions` and stores the index in state. Until then, `useChatSessions` returns `undefined`.

The context value:

```ts
type ChatSessionActions = {
  index: ChatSessionIndex;
  startDataSession: () => void;
  startCaseDesignSession: () => void;
  selectSession: (sessionId: string) => void;
  archiveSession: (sessionId: string) => void;
  reopenSession: (sessionId: string) => void;
  deleteArchivedSession: (sessionId: string) => void;
  setSessionTitle: (sessionId: string, title: string) => void;
};
```

Each action computes the next index with the pure functions, then `commitChatSessionIndex`. `startDataSession` and `startCaseDesignSession` use `crypto.randomUUID()` and `addChatSession`. `archiveSession` calls `archiveStoredChatSession`. `deleteArchivedSession` calls `deleteStoredChatSession`. State is updated even when the write returns `false`.

`useChatSessions` throws if it is used outside the provider. The root layout's `isChatAvailable={false}` provider still mounts `ChatSessionProvider`, so the hook works. It returns `undefined` until a workspace and user exist.

Wrap `ChatPanelContents` with `ChatSessionProvider` inside `ChatPanelProvider`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/components/ChatPanel/ChatSessionProvider/ChatSessionProvider.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/ChatSessionProvider src/components/ChatPanel/ChatPanelProvider/ChatPanelProvider.tsx
git commit -m "$(cat <<'EOF'
feat(chat): keep the open session in the chat provider

EOF
)"
```

---

### Task 6: The runtime loads one session at a time

**Files:**
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/useAvandarChatRuntime.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter.ts`
- Modify: `src/components/ChatPanel/ChatPanel/ChatPanel.tsx`
- Modify: `src/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager.tsx`
- Modify: `src/views/OntologyDesignerApp/NewCaseTypeButton.tsx`
- Modify: the runtime tests that call `ChatThreadStore` or `startNewChat`
- Test: `src/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.sessions.test.tsx`

- [ ] **Step 1: Write the failing runtime test**

Mount the runtime the way `useAvandarChatRuntime.contextTray.test.tsx` does, inside `ChatSessionProvider`. Seed two sessions through `loadChatSessions` is not available yet at mount, so write an index and two thread records before render:

- Session `s1` messages `[{ role: "user", content: "first" }]`, tray `[DATASET_REF]`, pending clarification `{ question: "Which year?", responseShape: { kind: "free_text" }, turnNumber: 1 }`.
- Session `s2` messages `[{ role: "user", content: "second" }]`, empty tray.

Select `s1`. After render, the thread shows "first" and the tray prop the runtime dispatched is the dataset ref.

Call `selectSession("s2")`. The thread shows "second". The tray is empty. `s1`'s stored record still has "first" and the clarification.

Call `startDataSession()`. `s2` is still in `openIds` and its stored messages are unchanged. The live thread is the empty new-chat seed, not the case-design kickoff.

Call `startCaseDesignSession()` while the page context app is `data-explorer`. The new session's kind is `case-design`, and the live thread contains `CaseDesignKickoff.CONTENT`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.sessions.test.tsx`

Expected: FAIL. The runtime still reads the legacy thread key.

- [ ] **Step 3: Load and swap sessions**

In `useAvandarChatRuntime`:

- Read `useChatSessions()`. Keep a ref of the active session id.
- Initial messages and the tray hydration effect read `index.selectedId` through `readRecord` and `ChatContextTrayStore.read` with that session id. If the record's messages are empty, seed with `makeNewChatThreadMessagesFromPageContext`, and when the session kind is `case-design` also append `CaseDesignKickoff`.
- Dispatch `setPendingClarification` and `setPendingCaseTypeDraft` from the record.
- An effect on `index.selectedId`: if the ref already holds a different id, `writeRecord` that id with the current messages and the panel's pending cards, and write or clear its tray. Then set the ref to the new id and `runtime.thread.reset` to the new record. Do not call `collapseComposer`, `beginCaseDesign`, or `close`.
- The persist-on-run-end effect writes `writeRecord` for `activeSessionIdRef.current`, including the current pending cards.
- `startNewChat` is no longer called by the panel. Keep the export until Task 7 replaces the header, but make it call `sessions.startDataSession()` and not `ChatThreadStore.clear` on the legacy key. Delete the branch that appends `CaseDesignKickoff` because the page is the case manager. The kickoff is added only when the selected session's kind is `case-design` and its stored messages are empty.
- Add `sessionKindRef`, updated in the same dependency effect as the other refs. In `createChatModelAdapter`, replace:

```ts
const isAgentTurn =
  currentPageContext.app !== "case-manager" && DataAgentFeature.isEnabled();
```

with:

```ts
const isAgentTurn =
  sessionKindRef.current === "data" && DataAgentFeature.isEnabled();
```

Update the adapter tests that used `app: "case-manager"` to mean "not an agent turn". Pass `sessionKind: "case-design"` for those. Add one test: page app `case-manager`, session kind `data`, agent switch on, and the turn goes to the agent. Add one test: page app `data-explorer`, session kind `case-design`, and the turn goes to today's chat.

- [ ] **Step 4: Remove the nonce**

In `ChatPanelStateManager`, delete `caseDesignSessionNonce` from the type, `initialState`, `defaultState`, and `beginCaseDesign`. `beginCaseDesign` returns `{ ...state, isOpen: true, layout: "composer", pendingClarification: undefined, pendingCaseTypeDraft: undefined }`.

Delete every remaining `caseDesignSessionNonce` assignment. The list at the time of this plan:

- `src/components/ChatPanel/ChatPanelProvider/ChatPanelProvider.tsx`
- `src/components/ChatPanel/ChatThread/ChatContextTray/__tests__/ChatContextTrayTestFixtures.tsx`
- `src/components/Nux/NuxTour/useNuxOpenChatPanel/useNuxOpenChatPanel.test.tsx`
- `src/components/ChatPanel/ChatPanel/ChatPanel.tsx`

In `ChatPanel.tsx`, delete `resetThreadForCaseDesignSession` and `collapseComposerOutsideCaseManager`. Set `onNewChatClick` to `startDataSession` for every page. Put `data-chat-layout={layout}` on the outer `Box`.

`NewCaseTypeButton` calls `sessions.startCaseDesignSession()` and then `dispatch.beginCaseDesign()`. If `useChatSessions()` is `undefined`, the click only calls `dispatch.beginCaseDesign()`.

- [ ] **Step 5: Run the tests**

Run:

```bash
pnpm vitest run \
  src/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.sessions.test.tsx \
  src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter.test.ts \
  src/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ChatPanel src/views/OntologyDesignerApp/NewCaseTypeButton.tsx src/components/Nux/NuxTour/useNuxOpenChatPanel/useNuxOpenChatPanel.test.tsx
git commit -m "$(cat <<'EOF'
feat(chat): switch the open thread when the session changes

EOF
)"
```

---

### Task 7: The composer follows the session

**Files:**
- Modify: `src/components/ChatPanel/ChatThread/Composer/Composer.tsx`
- Modify: `src/components/ChatPanel/ChatThread/Composer/Composer.test.tsx`

- [ ] **Step 1: Write the failing tests**

Mock `useChatSessions` in `Composer.test.tsx`. Default the selected session to `{ kind: "data", titleIsPlaceholder: true }`.

Replace "leaves the case designer composer disabled" with two tests:

```tsx
it("uses the agent editor for a data session on the case manager", () => {
  const input = _renderComposer({
    isAgentEnabled: true,
    kind: "data",
    context: { app: "case-manager" },
  });
  _expectEditableEditor(input);
  expect(screen.getByTestId("chat-context-tray")).toBeInTheDocument();
});

it("uses an enabled textarea for a case-design session", () => {
  const input = _renderComposer({
    isAgentEnabled: true,
    kind: "case-design",
    context: { app: "data-explorer" },
  });
  expect(input).toBeEnabled();
  expect(input.tagName).toBe("TEXTAREA");
  expect(screen.queryByTestId("chat-context-tray")).not.toBeInTheDocument();
});
```

Add the same textarea assertion with `isAgentEnabled: false`. A data session with the agent off on `case-manager` stays disabled, which the existing `it.each` already covers once the mock kind is `data`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/components/ChatPanel/ChatThread/Composer/Composer.test.tsx`

Expected: FAIL. The case manager page still disables the composer, and the data explorer still shows the agent editor for a case-design session.

- [ ] **Step 3: Change the predicates**

```ts
function _isComposerEnabled(options: {
  app: ChatPageContext.ChatApp;
  kind: ChatSessionKind;
}): boolean {
  if (options.kind === "case-design") {
    return true;
  }
  if (DataAgentFeature.isEnabled()) {
    return true;
  }
  return options.app === "data-explorer" || options.app === "dashboards";
}

function _isAgentComposer(kind: ChatSessionKind): boolean {
  return kind === "data" && DataAgentFeature.isEnabled();
}
```

Read the kind from `useChatSessions()`. When the hook returns `undefined`, treat the kind as `data`, which is today's agent behavior.

`_getPlaceholderKind` keeps the dashboard placeholder for a data session on a dashboard editor. Every other enabled session uses the data placeholder. A disabled data session keeps the disabled placeholder.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/components/ChatPanel/ChatThread/Composer/Composer.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/ChatThread/Composer
git commit -m "$(cat <<'EOF'
feat(chat): pick the composer from the session kind

EOF
)"
```

---

### Task 8: Tabs, overflow, and the archive

**Files:**
- Create: `src/components/ChatPanel/ChatThread/ChatSessionStrip/ChatSessionStrip.tsx`
- Create: `src/components/ChatPanel/ChatThread/ChatSessionStrip/ChatSessionStrip.module.css`
- Create: `src/components/ChatPanel/ChatThread/ChatSessionStrip/ChatSessionStrip.test.tsx`
- Modify: `src/components/ChatPanel/ChatPanelHeader/ChatPanelHeader.tsx`
- Modify: `src/components/ChatPanel/ChatPanel/ChatPanel.tsx`

- [ ] **Step 1: Write the failing test**

Render the strip with four open data sessions and two archived ones. The selected id is the fourth, so the index the test builds must already have moved it to the front (call `selectChatSession` before render).

Assert:

- `getAllByRole("tab")` has length 3.
- The first tab is selected (`aria-selected="true"`).
- A button named "More chats" exists. Opening it shows the fourth open session. Clicking that item calls `selectSession` with its id.
- A button named "Closed chats" exists. Each archived row has a "Reopen chat" action and a "Delete chat" action. Delete calls `deleteArchivedSession` and does not call `selectSession`.
- Each tab has a button named "Close chat". Clicking it calls `archiveSession` with that id.
- A placeholder data session's tab name is "New chat". A placeholder case-design session's tab name is "New case type". A session with `title: "Case counts"` and `titleIsPlaceholder: false` shows "Case counts".

Use Lingui's test render from `@/test-utils`. Do not assert English strings that the test renderer has not mounted with a catalog. If the test renderer translates, assert the English source, because the test locale is English.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/components/ChatPanel/ChatThread/ChatSessionStrip/ChatSessionStrip.test.tsx`

Expected: FAIL. The strip does not exist.

- [ ] **Step 3: Build the strip**

`ChatSessionStrip` reads `useChatSessions()`. It renders nothing when the hook returns `undefined`.

The tablist is a `div role="tablist"` with `aria-label={t\`Chats\`}`. Each visible id is a `button role="tab"` with `aria-selected`. The label is:

```ts
function _sessionLabel(
  session: ChatSessionMeta,
  t: ReturnType<typeof useLingui>["t"],
): string {
  if (!session.titleIsPlaceholder && session.title) {
    return session.title;
  }
  return session.kind === "case-design" ? t`New case type` : t`New chat`;
}
```

Call this from the component so both `t` macros are invoked as macros. The close control is an `ActionIcon` named `t\`Close chat\`` with `event.stopPropagation()` so it does not also select. Clicking the tab calls `selectSession`.

Overflow renders a Mantine `Menu` only when `overflowOpenIds` is non-empty. The target is a button named `t\`More chats\``. Each item calls `selectSession`.

The archive menu renders only when `archivedIds` is non-empty. The target is named `t\`Closed chats\``. Each row is the label, plus a button named `t\`Reopen chat\`` (`reopenSession`) and a button named `t\`Delete chat\`` (`deleteArchivedSession`).

Styles go in `ChatSessionStrip.module.css`. The selected tab uses a Mantine color token through a class, not an inline style. No Tailwind.

Render `ChatSessionStrip` under the title row. `ChatPanelHeader` can render it as a second row inside a stack, or `ChatPanel` can render it between the header and the thread. Put it in the header so the tabs scroll with the title band. The header grows vertically. Do not change the title, **New chat**, or **Close panel** actions.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/components/ChatPanel/ChatThread/ChatSessionStrip/ChatSessionStrip.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/ChatThread/ChatSessionStrip src/components/ChatPanel/ChatPanelHeader src/components/ChatPanel/ChatPanel/ChatPanel.tsx
git commit -m "$(cat <<'EOF'
feat(chat): show open sessions and the archive

EOF
)"
```

---

### Task 9: The title excerpt

**Files:**
- Create: `shared/agent/chatTitle/buildChatSessionTitleExcerpt.ts`
- Test: `shared/agent/chatTitle/buildChatSessionTitleExcerpt.test.ts`

The excerpt is the text parts of the latest user message and the assistant message just committed. It uses the mask the hosted turn already used.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildChatSessionTitleExcerpt } from "$/agent/chatTitle/buildChatSessionTitleExcerpt.ts";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken.ts";

const DATASET_ID = "11111111-1111-4111-8111-111111111111";
const OFFLINE_ANSWER = "[An answer from the offline model, not shown]";

describe("buildChatSessionTitleExcerpt", () => {
  it("names a mention by type and masks the user text", () => {
    const token = ChatMentionToken.buildToken({
      gadgetType: "dataset",
      gadgetId: DATASET_ID,
      subId: null,
    });
    const excerpt = buildChatSessionTitleExcerpt({
      messages: [
        { role: "user", content: `Cases for ${token} in Ada` },
        { role: "assistant", content: "42" },
      ],
      mask: (text) => text.replaceAll("Ada", "Name1"),
      offlineAnswerText: OFFLINE_ANSWER,
    });
    expect(excerpt).toContain('@"dataset"');
    expect(excerpt).toContain("Name1");
    expect(excerpt).not.toContain(DATASET_ID);
    expect(excerpt).not.toContain("@{");
    expect(excerpt).not.toContain("Ada");
  });

  it("replaces an offline answer and drops tool-call sql", () => {
    const excerpt = buildChatSessionTitleExcerpt({
      messages: [
        { role: "user", content: "How many cases?" },
        {
          role: "assistant",
          content: [
            { type: "text", text: "The secret row is Ada." },
            {
              type: "tool-call",
              toolName: "run_query",
              args: { sql: "select name from patients" },
            },
          ],
          metadata: { custom: { isOfflineAnswer: true } },
        },
      ],
      mask: (text) => text,
      offlineAnswerText: OFFLINE_ANSWER,
    });
    expect(excerpt).toContain(OFFLINE_ANSWER);
    expect(excerpt).not.toContain("secret row");
    expect(excerpt).not.toContain("select name");
  });
});
```

`shared/` does not import the React module that owns the offline sentence. The runtime passes `OfflineAnswerMessage.hostedContent`, which is the same sentence as `OFFLINE_ANSWER`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run shared/agent/chatTitle/buildChatSessionTitleExcerpt.test.ts`

Expected: FAIL. The module does not exist.

- [ ] **Step 3: Write the excerpt builder**

```ts
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken.ts";

const EXCERPT_LIMIT = 2000;

type ExcerptMessage = {
  role: string;
  content: unknown;
  metadata?: { custom?: Record<string, unknown> };
};

function _textParts(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .filter((part): part is { type: "text"; text: string } => {
      return (
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string"
      );
    })
    .map((part) => part.text)
    .join("\n");
}

function _latest(messages: readonly ExcerptMessage[], role: string): ExcerptMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === role) {
      return message;
    }
  }
  return undefined;
}

/** The user and assistant text a title model may see. */
export function buildChatSessionTitleExcerpt(options: {
  messages: readonly ExcerptMessage[];
  mask: (text: string) => string;
  offlineAnswerText: string;
}): string {
  const user = _latest(options.messages, "user");
  const assistant = _latest(options.messages, "assistant");
  const userText = options.mask(
    ChatMentionToken.toModelText(_textParts(user?.content), (ref) => {
      return ref.gadgetType;
    }),
  );
  const assistantIsOffline = assistant?.metadata?.custom?.isOfflineAnswer === true;
  const assistantText = assistantIsOffline
    ? options.offlineAnswerText
    : options.mask(_textParts(assistant?.content));
  const excerpt = `user: ${userText}\nassistant: ${assistantText}`;
  return excerpt.length > EXCERPT_LIMIT ? excerpt.slice(0, EXCERPT_LIMIT) : excerpt;
}
```

`toModelText` quotes the type, so the excerpt contains `@"dataset"` and not the id. Tool-call parts are not text parts, so their SQL is absent.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run shared/agent/chatTitle/buildChatSessionTitleExcerpt.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/agent/chatTitle/buildChatSessionTitleExcerpt.ts shared/agent/chatTitle/buildChatSessionTitleExcerpt.test.ts
git commit -m "$(cat <<'EOF'
feat(chat): build a redacted excerpt for session titles

EOF
)"
```

---

### Task 10: The title prompt and the title route

**Files:**
- Create: `shared/agent/chatTitle/chatTitlePrompt.ts`
- Test: `shared/agent/chatTitle/chatTitlePrompt.test.ts`
- Create: `supabase/functions/chat/PostChatTitle/PostChatTitle.ts`
- Modify: `supabase/functions/chat/ChatRoutes.ts`
- Modify: `supabase/functions/chat/ChatRoutes.types.ts`

- [ ] **Step 1: Write the failing prompt test**

```ts
import { describe, expect, it } from "vitest";
import {
  CHAT_TITLE_PROMPT_ID,
  buildChatTitleMessages,
  isChatTitlePromptId,
  parseChatTitleReply,
} from "$/agent/chatTitle/chatTitlePrompt.ts";

describe("chatTitlePrompt", () => {
  it("serves chat-title-v1 and rejects any other id", () => {
    expect(isChatTitlePromptId(CHAT_TITLE_PROMPT_ID)).toBe(true);
    expect(isChatTitlePromptId("data-agent-v3")).toBe(false);
  });

  it("asks for a noun phrase in the given locale and includes the excerpt", () => {
    const messages = buildChatTitleMessages({
      excerpt: "user: How many cases?\nassistant: 42",
      locale: "es",
      placeholder: "Nuevo chat",
    });
    const system = messages[0]?.content ?? "";
    const user = messages[1]?.content ?? "";
    expect(system).toContain("short noun phrase");
    expect(system).toContain("placeholder exactly");
    expect(user).toContain("Locale: es");
    expect(user).toContain("Placeholder: Nuevo chat");
    expect(user).toContain("How many cases?");
  });

  it("rejects an empty reply, the placeholder, and keeps the model's words", () => {
    expect(parseChatTitleReply("  ", "New chat")).toBeUndefined();
    expect(parseChatTitleReply("New chat", "New chat")).toBeUndefined();
    expect(parseChatTitleReply('"Case counts"', "New chat")).toBe("Case counts");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run shared/agent/chatTitle/chatTitlePrompt.test.ts`

Expected: FAIL. The module does not exist.

- [ ] **Step 3: Write the prompt module**

```ts
import type { LocalLlmMessage } from "@/lib/agent/localModels/LocalLlm";
```

Do not import from `src/` inside `shared/`. Define the message type locally:

```ts
type ChatTitleMessage = { role: "system" | "user"; content: string };

export const CHAT_TITLE_PROMPT_IDS = ["chat-title-v1"] as const;
export const CHAT_TITLE_PROMPT_ID = "chat-title-v1";
const TITLE_LIMIT = 80;

export function isChatTitlePromptId(value: string): boolean {
  return (CHAT_TITLE_PROMPT_IDS as readonly string[]).includes(value);
}

export function buildChatTitleMessages(options: {
  excerpt: string;
  locale: string;
  placeholder: string;
}): ChatTitleMessage[] {
  return [
    {
      role: "system",
      content: [
        "You name one chat for a tab.",
        "Reply with a short noun phrase in the requested locale.",
        "No quotes, no period, and no explanation.",
        "If the excerpt has no topic, reply with the placeholder exactly as it is written.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Locale: ${options.locale}`,
        `Placeholder: ${options.placeholder}`,
        "Excerpt:",
        options.excerpt,
      ].join("\n"),
    },
  ];
}

export function parseChatTitleReply(
  reply: string,
  placeholder: string,
): string | undefined {
  const firstLine = reply.trim().split("\n")[0]?.trim() ?? "";
  const unquoted = firstLine.replace(/^["'](.*)["']$/, "$1").trim();
  if (unquoted.length === 0 || unquoted === placeholder.trim()) {
    return undefined;
  }
  return unquoted.length > TITLE_LIMIT
    ? unquoted.slice(0, TITLE_LIMIT).trim()
    : unquoted;
}
```

- [ ] **Step 4: Add the route**

`PostChatTitle` is a `POST` at `/:workspaceId/title/:promptId`.

Body schema:

```ts
{
  excerpt: z.string().max(2000),
  locale: z.string().min(1).max(35),
  placeholder: z.string().min(1).max(80),
}
```

The action:

1. Throw `AvaHTTPError` with `BAD_REQUEST` when `isChatTitlePromptId(promptId)` is false. Message: `Unknown title prompt "${promptId}". Reload the page.`
2. Throw if `OPEN_ROUTER_API_KEY` is missing, the same way `PostAgentStream` does.
3. Do not check the data explorer role. The chat function already requires a signed-in workspace member, and a case-design session can be titled without that role.
4. Call `sendOpenRouterRequest` the way `runMeasurementExtraction` does. Model: `DATA_AGENT_MODEL_ROSTER.primary.openRouterId`. Messages: `buildChatTitleMessages` of the body. `max_tokens: 32`. `temperature: 0`. No tools. The client does not send a system prompt.
5. Return `{ title: text }` where `text` is the model's raw text. The browser parses it. A parse failure is a placeholder, not a 400, so the route still returns the raw text.

Add the path to `ChatRoutes` and to the `ChatAPI` tuple and path map:

```ts
"/:workspaceId/title/:promptId": {
  POST: {
    pathParams: { workspaceId: string; promptId: string };
    body: { excerpt: string; locale: string; placeholder: string };
    returnType: { title: string };
  };
};
```

- [ ] **Step 5: Run the prompt test and typecheck the route file's imports**

Run: `pnpm vitest run shared/agent/chatTitle/chatTitlePrompt.test.ts`

Expected: PASS.

Run: `pnpm exec tsc -b --noEmit`

Expected: PASS. If the route's `ChatAPI` entry is missing, this is the command that fails.

- [ ] **Step 6: Commit**

```bash
git add shared/agent/chatTitle/chatTitlePrompt.ts shared/agent/chatTitle/chatTitlePrompt.test.ts supabase/functions/chat
git commit -m "$(cat <<'EOF'
feat(chat): serve the chat-title-v1 prompt

EOF
)"
```

`chat-title-v1` can still change until the commit that deploys it. After that deploy, a prompt change needs a new id in `CHAT_TITLE_PROMPT_IDS`.

---

### Task 11: Ask for a title after a reply

**Files:**
- Create: `src/components/ChatPanel/ChatSessionTitle/requestChatSessionTitle.ts`
- Test: `src/components/ChatPanel/ChatSessionTitle/requestChatSessionTitle.test.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/useAvandarChatRuntime.ts`

The reply is already on screen before this runs. A failure leaves the placeholder.

- [ ] **Step 1: Write the failing test**

```ts
it("stores a hosted title and does not send it back to the data agent", async () => {
  const setSessionTitle = vi.fn();
  const post = vi.fn().mockResolvedValue({ title: "Case counts" });
  await requestChatSessionTitle({
    sessionId: "s1",
    kind: "data",
    workspaceId: "ws-1",
    excerpt: "user: How many cases?\nassistant: 42",
    locale: "en",
    placeholder: "New chat",
    isOffline: false,
    post,
    completeOffline: vi.fn(),
    setSessionTitle,
  });
  expect(post).toHaveBeenCalledWith({
    route: "chat/:workspaceId/title/:promptId",
    pathParams: { workspaceId: "ws-1", promptId: "chat-title-v1" },
    body: {
      excerpt: "user: How many cases?\nassistant: 42",
      locale: "en",
      placeholder: "New chat",
    },
  });
  expect(setSessionTitle).toHaveBeenCalledWith("s1", "Case counts");
});

it("leaves the placeholder when the title route fails", async () => {
  const setSessionTitle = vi.fn();
  await requestChatSessionTitle({
    sessionId: "s1",
    kind: "data",
    workspaceId: "ws-1",
    excerpt: "user: Hi\nassistant: Hello",
    locale: "en",
    placeholder: "New chat",
    isOffline: false,
    post: vi.fn().mockRejectedValue(new Error("down")),
    completeOffline: vi.fn(),
    setSessionTitle,
  });
  expect(setSessionTitle).not.toHaveBeenCalled();
});

it("asks the offline model and does not call the route", async () => {
  const post = vi.fn();
  const completeOffline = vi.fn().mockResolvedValue({ text: "Conteos" });
  const setSessionTitle = vi.fn();
  await requestChatSessionTitle({
    sessionId: "s1",
    kind: "data",
    workspaceId: "ws-1",
    excerpt: "user: Hi\nassistant: [An answer from the offline model, not shown]",
    locale: "es",
    placeholder: "Nuevo chat",
    isOffline: true,
    post,
    completeOffline,
    setSessionTitle,
  });
  expect(post).not.toHaveBeenCalled();
  expect(completeOffline).toHaveBeenCalledOnce();
  expect(setSessionTitle).toHaveBeenCalledWith("s1", "Conteos");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/components/ChatPanel/ChatSessionTitle/requestChatSessionTitle.test.ts`

Expected: FAIL. The module does not exist.

- [ ] **Step 3: Write the request**

`requestChatSessionTitle` builds messages with `buildChatTitleMessages`. For a hosted reply it calls `post` and `parseChatTitleReply(response.title, placeholder)`. For an offline reply it calls `completeOffline` with:

```ts
{
  modelId: LocalChatModel.OFFLINE_BUNDLE.answer,
  messages,
  maxTokens: 32,
  temperature: 0,
}
```

A thrown error or an unparsed reply returns without calling `setSessionTitle`.

Wire it from the persist-on-run-end effect, after `writeRecord` succeeds, only when the selected session's `titleIsPlaceholder` is true and the committed messages include an assistant message. Build the excerpt there only if the turn still has `conversation.sqlVault.maskText`. The adapter's agent path has that vault. Today's chat path has its own redaction. Pass the mask the turn just used. If the turn has no mask, skip the hosted request. Do not send raw names.

`isOffline` is `OfflineAnswerMessage.isOfflineAnswer` on the latest assistant message.

Call `void requestChatSessionTitle(...).catch(() => undefined)`. Do not await it inside the subscriber. Pass `APIClient.post` as `post` and `OfflineChatEngineStore.complete` as `completeOffline`.

Do not add the title, the excerpt, or the locale to the data-agent messages.

- [ ] **Step 4: Run the tests**

Run:

```bash
pnpm vitest run \
  src/components/ChatPanel/ChatSessionTitle/requestChatSessionTitle.test.ts \
  src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter.test.ts
```

Expected: PASS. The adapter test file is the turn-text regression. It must pass without a change to the blocks a data session sends, other than the routing change Task 6 already made.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPanel/ChatSessionTitle src/components/ChatPanel/useAvandarChatRuntime
git commit -m "$(cat <<'EOF'
feat(chat): name a session after its first reply

EOF
)"
```

---

### Task 12: Browser spec

**Files:**
- Create: `tests/e2e/agent-chat-sessions.spec.ts`

- [ ] **Step 1: Confirm the local database**

Run `ava supabase status` from this worktree. The first line must name this branch's project. If it names the develop stack, run `ava supabase switch` and then `pnpm fns:update-env`. Do not continue on the shared stack.

- [ ] **Step 2: Write the spec**

Follow `tests/e2e/agent-chat-mentions.spec.ts` for sign-in, the agent switch, and the proxy mock. Follow `tests/e2e/case-list-field.spec.ts` for the **New case type** button. Timeout stays at the Playwright default, under 45 seconds.

```ts
function _replyStream(): string {
  const usage = {
    input: 10,
    output: 5,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 15,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
  const events = [
    { type: "start" },
    { type: "text_start", contentIndex: 0 },
    { type: "text_delta", contentIndex: 0, delta: "Forty two." },
    { type: "text_end", contentIndex: 0, contentSignature: "" },
    { type: "done", reason: "stop", usage },
  ];
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
}
```

The spec:

1. `addInitScript` sets `avandar:data-agent` to `on`.
2. Mock `**/functions/v1/chat/*/agent/data-agent-v3/api/stream` with `_replyStream()`.
3. Mock `**/functions/v1/chat/*/title/chat-title-v1` with `{ title: "Case counts" }`.
4. Sign in with `e2eWorkerDb.primaryUser` and open `/${workspaceSlug}/data-explorer`.
5. `openAgentChat`. Type `How many cases?` into the message box and press Enter.
6. Expect a tab named "Case counts" and the user text "How many cases?" in the thread. If the run never finishes, replace `_replyStream` with the tool-call body in `tests/e2e/agent-chat-mentions.spec.ts` (`_runQueryStream`) and assert the user text only.
7. Click **New chat** (`getNewChatButton` from `tests/e2e/helpers/chatPanelFlow.ts`). Expect a tab named "New chat" and expect "Case counts" to still be a tab. Expect `[data-chat-layout]` to stay `docked`.
8. Reload. Expect the selected tab to be "New chat" and expect "How many cases?" not to be in the thread.
9. Click "Case counts". Expect "How many cases?" in the thread.
10. Click that tab's "Close chat". Expect "Case counts" to leave the tablist. Open "Closed chats", click "Reopen chat" on that row, and expect "Case counts" selected again with "How many cases?" visible.
11. Open "Closed chats" and click "Delete chat" on a closed session after closing one again. Expect that name to be gone from "Closed chats".
12. Go to `/${workspaceSlug}/ontology-designer`. Click the first button named "New case type". Expect a tab named "New case type", expect "Case counts" to still be a tab, and expect `[data-chat-layout="composer"]`.
13. Click "Case counts". Expect `[data-chat-layout="composer"]` to remain.
14. Go back to `/${workspaceSlug}/data-explorer`. Expect `[data-chat-layout="composer"]` to remain. A page change does not dock the panel.

- [ ] **Step 3: Run the spec**

Run: `pnpm test:e2e tests/e2e/agent-chat-sessions.spec.ts`

Expected: PASS. If it fails, fix the product or the spec and run this file again. Do not run the full e2e suite.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/agent-chat-sessions.spec.ts
git commit -m "$(cat <<'EOF'
test(chat): cover session tabs and the archive in the browser

EOF
)"
```

---

### Task 13: Done when

**Files:**
- Modify: `src/i18n/locales/**` only by the extract and compile commands, never by hand

- [ ] **Step 1: Typecheck and translate**

Run:

```bash
pnpm exec tsc -b --noEmit
pnpm i18n:extract
pnpm i18n:compile
```

Fill empty `msgstr` entries by running `pnpm translations` if `pnpm i18n:check` reports missing strings. Do not hand-merge `messages.ts`.

Run: `pnpm i18n:check`

Expected: exit 0.

- [ ] **Step 2: Run the session unit tests once more**

```bash
pnpm vitest run \
  src/components/ChatPanel/ChatSessionIndex/ChatSessionIndex.test.ts \
  src/components/ChatPanel/ChatSessionStore/ChatSessionStore.test.ts \
  src/components/ChatPanel/ChatThreadStore/ChatThreadStore.test.ts \
  src/components/ChatPanel/ChatContextTrayStore/ChatContextTrayStore.test.ts \
  src/components/ChatPanel/ChatSessionProvider/ChatSessionProvider.test.tsx \
  src/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.sessions.test.tsx \
  src/components/ChatPanel/ChatThread/Composer/Composer.test.tsx \
  src/components/ChatPanel/ChatThread/ChatSessionStrip/ChatSessionStrip.test.tsx \
  src/components/ChatPanel/ChatSessionTitle/requestChatSessionTitle.test.ts \
  shared/agent/chatTitle/buildChatSessionTitleExcerpt.test.ts \
  shared/agent/chatTitle/chatTitlePrompt.test.ts \
  src/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales
git commit -m "$(cat <<'EOF'
docs(ai-agent): mark multiple chat sessions built

EOF
)"
```

Do not push. Do not merge into `demo/measles`. Ask before either.
