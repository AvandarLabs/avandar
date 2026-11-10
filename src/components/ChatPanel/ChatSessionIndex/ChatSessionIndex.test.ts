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
    const index = addChatSession(
      createChatSessionIndex({ id: "a", kind: "data" }),
      {
        id: "b",
        kind: "case-design",
      },
    );
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
    expect(setChatSessionTitle(index, { sessionId: "a", title: "   " })).toBe(
      index,
    );
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
    expect(
      parseChatSessionIndex({ openIds: [], sessions: {} }),
    ).toBeUndefined();
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
