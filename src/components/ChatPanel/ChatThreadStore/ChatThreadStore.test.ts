/** Behavioral tests for the live chat thread localStorage slot. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatViewEvent } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";
import { ChatThreadStore } from "./ChatThreadStore";
import type { ThreadMessageLike } from "@assistant-ui/react";

const WORKSPACE_ID = "ws-1";
const USER_ID = "user-1";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("ChatThreadStore", () => {
  it("round-trips committed messages including frozen view events", () => {
    const messages: ThreadMessageLike[] = [
      ChatViewEvent.makeThreadMessageLikeFromSnapshot({
        app: "data-explorer",
        route: "/acme/data-explorer",
      }),
      { role: "user", content: "count rows" },
      { role: "assistant", content: "42" },
    ];
    ChatThreadStore.write({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      messages,
    });
    expect(
      ChatThreadStore.read({
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
      }),
    ).toEqual(messages);
  });

  it("does not persist a trailing pending view event", () => {
    const messages: ThreadMessageLike[] = [
      { role: "user", content: "count rows" },
      { role: "assistant", content: "42" },
      ChatViewEvent.makeThreadMessageLikeFromSnapshot({
        app: "dashboards",
        route: "/acme/dashboards",
      }),
    ];
    ChatThreadStore.write({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      messages,
    });
    expect(
      ChatThreadStore.read({
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
      }),
    ).toEqual(messages.slice(0, 2));
  });

  it("returns an empty thread for missing or corrupt blobs", () => {
    expect(
      ChatThreadStore.read({
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
      }),
    ).toEqual([]);
    window.localStorage.setItem(
      ChatThreadStore.legacyStorageKey({
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
      }),
      "{not-json",
    );
    expect(
      ChatThreadStore.read({
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
      }),
    ).toEqual([]);
  });

  it("clear deletes the slot", () => {
    ChatThreadStore.write({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      messages: [{ role: "user", content: "hi" }],
    });
    ChatThreadStore.clear({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
    });
    expect(
      ChatThreadStore.read({
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
      }),
    ).toEqual([]);
  });

  it("round-trips a query result part without storing rows", () => {
    const part = {
      type: "data" as const,
      name: "agent-query-result",
      data: {
        version: 1,
        sql: "SELECT 1",
        chartType: "table",
        title: "How many?",
        display: "embed",
      },
    };
    const messages: ThreadMessageLike[] = [
      { role: "user", content: "How many?" },
      { role: "assistant", content: [{ type: "text", text: "One." }, part] },
    ];
    ChatThreadStore.write({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      messages,
    });

    expect(
      ChatThreadStore.read({ workspaceId: WORKSPACE_ID, userId: USER_ID }),
    ).toEqual(messages);
    expect(
      window.localStorage.getItem(
        ChatThreadStore.legacyStorageKey({
          workspaceId: WORKSPACE_ID,
          userId: USER_ID,
        }),
      ),
    ).not.toContain("rows");
  });

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
});
