/** Behavioral tests for the live chat thread localStorage slot. */
import { afterEach, describe, expect, it } from "vitest";
import { ChatViewEvent } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";
import { ChatThreadStore } from "./ChatThreadStore";
import type { ThreadMessageLike } from "@assistant-ui/react";

const WORKSPACE_ID = "ws-1";
const USER_ID = "user-1";

afterEach(() => {
  window.localStorage.clear();
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
      ChatThreadStore.storageKey({
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
});
