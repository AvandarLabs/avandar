import { describe, expect, it } from "vitest";
/** Behavioral tests for hidden chat view-change events. */
import { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import { ChatViewEvent } from "./ChatViewEvent";
import type { ThreadMessageLike } from "@assistant-ui/react";

const EXPLORER = ChatViewEvent.makeSnapshotFromPageContext({
  pageContext: ChatPageContext.createDataExplorerViewContext({
    openDatasetId: "ds-1",
    lastSql: "select 1",
    lastError: "boom",
  }),
  route: "/acme/data-explorer",
});

const DASHBOARD = ChatViewEvent.makeSnapshotFromPageContext({
  pageContext: ChatPageContext.createDashboardsViewContext({
    dashboardId: "11111111-1111-4111-8111-111111111111",
  }),
  route: "/acme/dashboards/edit/11111111-1111-4111-8111-111111111111",
});

describe("ChatViewEvent", () => {
  it("omits live SQL and errors from the snapshot", () => {
    expect(EXPLORER).toEqual({
      app: "data-explorer",
      route: "/acme/data-explorer",
      openDatasetId: "ds-1",
    });
    expect(EXPLORER).not.toHaveProperty("lastSql");
  });

  it("formats a stable view-changed line", () => {
    expect(ChatViewEvent.format(EXPLORER)).toBe(
      "[View changed: app=data-explorer; route=/acme/data-explorer; dataset=ds-1; dashboard=none]",
    );
    expect(ChatViewEvent.format(DASHBOARD)).toBe(
      "[View changed: app=dashboards; route=/acme/dashboards/edit/11111111-1111-4111-8111-111111111111; dataset=none; dashboard=11111111-1111-4111-8111-111111111111]",
    );
  });

  it("includes route, dataset, and dashboard in equality", () => {
    expect(
      ChatViewEvent.equals({ left: EXPLORER, right: { ...EXPLORER } }),
    ).toBe(true);
    expect(ChatViewEvent.equals({ left: EXPLORER, right: DASHBOARD })).toBe(
      false,
    );
    expect(
      ChatViewEvent.equals({
        left: EXPLORER,
        right: { ...EXPLORER, openDatasetId: "ds-2" },
      }),
    ).toBe(false);
  });

  it("recognizes view-change content and metadata", () => {
    expect(
      ChatViewEvent.isViewChangeContent(ChatViewEvent.format(EXPLORER)),
    ).toBe(true);
    expect(ChatViewEvent.isViewChangeContent("How many rows?")).toBe(false);
    expect(ChatViewEvent.isInternal(ChatViewEvent.metadata)).toBe(true);
    expect(ChatViewEvent.isInternal(undefined)).toBe(false);
    expect(
      ChatViewEvent.isInternal({ custom: { isDiscoveryContinuation: true } }),
    ).toBe(false);
  });

  it("appends a trailing view event when the snapshot is new", () => {
    const next = ChatViewEvent.applyToMessages({
      messages: [],
      snapshot: EXPLORER,
    });
    expect(next).toHaveLength(1);
    expect(next[0]?.content).toBe(ChatViewEvent.format(EXPLORER));
    expect(next[0]?.metadata).toEqual(ChatViewEvent.metadata);
    expect(next[0]?.role).toBe("user");
  });

  it("replaces a trailing view event instead of stacking", () => {
    const first = ChatViewEvent.applyToMessages({
      messages: [],
      snapshot: EXPLORER,
    });
    const second = ChatViewEvent.applyToMessages({
      messages: first,
      snapshot: DASHBOARD,
    });
    expect(second).toHaveLength(1);
    expect(second[0]?.content).toBe(ChatViewEvent.format(DASHBOARD));
  });

  it("does not add an event when the trailing view already matches", () => {
    const first = ChatViewEvent.applyToMessages({
      messages: [],
      snapshot: EXPLORER,
    });
    const second = ChatViewEvent.applyToMessages({
      messages: first,
      snapshot: EXPLORER,
    });
    expect(second).toEqual(first);
  });

  it("appends a new view event after a real user message", () => {
    const withUser: ThreadMessageLike[] = [
      ...ChatViewEvent.applyToMessages({ messages: [], snapshot: EXPLORER }),
      { role: "user", content: "count rows" },
    ];
    const next = ChatViewEvent.applyToMessages({
      messages: withUser,
      snapshot: DASHBOARD,
    });
    expect(next).toHaveLength(3);
    expect(next[2]?.content).toBe(ChatViewEvent.format(DASHBOARD));
  });
});
