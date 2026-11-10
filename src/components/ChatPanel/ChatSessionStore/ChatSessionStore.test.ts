/** Behavioral tests for persisted chat session loading and archiving. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatContextTrayStore } from "@/components/ChatPanel/ChatContextTrayStore/ChatContextTrayStore";
import { ARCHIVE_LIMIT } from "@/components/ChatPanel/ChatSessionIndex/ChatSessionIndex";
import { ChatThreadStore } from "@/components/ChatPanel/ChatThreadStore/ChatThreadStore";
import { archiveStoredChatSession, loadChatSessions } from "./ChatSessionStore";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";

const IDENTITY = { workspaceId: "ws-1", userId: "user-1" };
const DATASET_REF: Gadget.Ref = {
  gadgetType: "dataset",
  gadgetId: "11111111-1111-4111-8111-111111111111",
  subId: null,
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

  it("retries migration after the session thread write fails", () => {
    ChatThreadStore.write({
      ...IDENTITY,
      messages: [{ role: "user", content: "kept" }],
    });
    ChatContextTrayStore.write({ ...IDENTITY, refs: [DATASET_REF] });
    const writeRecord = vi
      .spyOn(ChatThreadStore, "writeRecord")
      .mockReturnValueOnce(false);

    loadChatSessions(IDENTITY);

    expect(
      window.localStorage.getItem(
        `ava.chat.sessions.${IDENTITY.workspaceId}.${IDENTITY.userId}`,
      ),
    ).toBeNull();
    writeRecord.mockRestore();
    const retried = loadChatSessions(IDENTITY);
    expect(
      ChatThreadStore.readRecord({
        ...IDENTITY,
        sessionId: retried.selectedId,
      }).messages,
    ).toEqual([{ role: "user", content: "kept" }]);
    expect(
      ChatContextTrayStore.read({
        ...IDENTITY,
        sessionId: retried.selectedId,
      }),
    ).toEqual([DATASET_REF]);
  });

  it("retries migration after the session tray write fails", () => {
    ChatThreadStore.write({
      ...IDENTITY,
      messages: [{ role: "user", content: "kept" }],
    });
    ChatContextTrayStore.write({ ...IDENTITY, refs: [DATASET_REF] });
    const writeTray = vi
      .spyOn(ChatContextTrayStore, "write")
      .mockReturnValueOnce(false);

    loadChatSessions(IDENTITY);

    expect(
      window.localStorage.getItem(
        `ava.chat.sessions.${IDENTITY.workspaceId}.${IDENTITY.userId}`,
      ),
    ).toBeNull();
    writeTray.mockRestore();
    const retried = loadChatSessions(IDENTITY);
    expect(
      ChatThreadStore.readRecord({
        ...IDENTITY,
        sessionId: retried.selectedId,
      }).messages,
    ).toEqual([{ role: "user", content: "kept" }]);
    expect(
      ChatContextTrayStore.read({
        ...IDENTITY,
        sessionId: retried.selectedId,
      }),
    ).toEqual([DATASET_REF]);
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
        archivedIds: [id, ...index.archivedIds],
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
