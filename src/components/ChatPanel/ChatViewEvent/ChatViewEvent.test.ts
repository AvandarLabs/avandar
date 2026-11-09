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

const CONCEPT_ID = "22222222-2222-4222-8222-222222222222";
const INDIVIDUAL_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_INDIVIDUAL_ID = "44444444-4444-4444-8444-444444444444";

/** A case page snapshot for one individual of the shared concept. */
function _caseSnapshot(
  individualId: string,
  conceptId = CONCEPT_ID,
): ReturnType<typeof ChatViewEvent.makeSnapshotFromPageContext> {
  return ChatViewEvent.makeSnapshotFromPageContext({
    pageContext: { app: "other" },
    route: `/acme/individual-manager/${conceptId}/${individualId}`,
  });
}

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

  it("hides the case id in a case route, keeping the case type", () => {
    const line = ChatViewEvent.format(_caseSnapshot(INDIVIDUAL_ID));

    expect(line).toBe(
      "[View changed: app=other; " +
        `route=/acme/individual-manager/${CONCEPT_ID}/<case>; ` +
        "dataset=none; dashboard=none]",
    );
    expect(line).not.toContain(INDIVIDUAL_ID);
  });

  it("leaves a case type route without a case unchanged", () => {
    const line = ChatViewEvent.format(
      ChatViewEvent.makeSnapshotFromPageContext({
        pageContext: { app: "other" },
        route: `/acme/individual-manager/${CONCEPT_ID}`,
      }),
    );

    expect(line).toContain(`route=/acme/individual-manager/${CONCEPT_ID};`);
  });

  it("dedupes case pages by case type, since the case id is hidden", () => {
    const first = ChatViewEvent.applyToMessages({
      messages: [],
      snapshot: _caseSnapshot(INDIVIDUAL_ID),
    });

    expect(
      ChatViewEvent.applyToMessages({
        messages: first,
        snapshot: _caseSnapshot(INDIVIDUAL_ID),
      }),
    ).toEqual(first);
    expect(
      ChatViewEvent.applyToMessages({
        messages: first,
        snapshot: _caseSnapshot(OTHER_INDIVIDUAL_ID),
      }),
    ).toEqual(first);
    const otherType = ChatViewEvent.applyToMessages({
      messages: first,
      snapshot: _caseSnapshot(INDIVIDUAL_ID, "other-concept"),
    });
    expect(otherType).toHaveLength(1);
    expect(otherType[0]?.content).toContain("other-concept/<case>");
  });

  it("hides the case id in a view-change line stored before the fix", () => {
    const storedLine =
      "[View changed: app=other; " +
      `route=/acme/individual-manager/${CONCEPT_ID}/${INDIVIDUAL_ID}; ` +
      "dataset=none; dashboard=none]";

    expect(ChatViewEvent.toModelContent(storedLine)).toBe(
      ChatViewEvent.format(_caseSnapshot(INDIVIDUAL_ID)),
    );
    expect(ChatViewEvent.toModelContent(ChatViewEvent.format(EXPLORER))).toBe(
      ChatViewEvent.format(EXPLORER),
    );
  });

  /** Routes and the route each should format to. */
  const CASE_ROUTES = [
    [
      "a case page",
      "/acme/individual-manager/c1/i1",
      "/acme/individual-manager/c1/<case>",
    ],
    [
      "a trailing slash",
      "/acme/individual-manager/c1/i1/",
      "/acme/individual-manager/c1/<case>/",
    ],
    [
      "a query",
      "/acme/individual-manager/c1/i1?tab=2",
      "/acme/individual-manager/c1/<case>?tab=2",
    ],
    [
      "a hash",
      "/acme/individual-manager/c1/i1#notes",
      "/acme/individual-manager/c1/<case>#notes",
    ],
    [
      "a workspace slug named individual-manager",
      "/individual-manager/individual-manager/c1/i1",
      "/individual-manager/individual-manager/c1/<case>",
    ],
    [
      "a case type page with no case",
      "/acme/individual-manager/c1",
      "/acme/individual-manager/c1",
    ],
  ] as const;

  it.each(CASE_ROUTES)("hides the case id in %s", (_name, route, expected) => {
    const line = ChatViewEvent.format({ app: "other", route });

    expect(line).toContain(`route=${expected};`);
    expect(line.replace(expected, "")).not.toContain("i1");
  });

  it.each(CASE_ROUTES)(
    "hides the case id in a stored line for %s",
    (_name, route, expected) => {
      const storedLine =
        `[View changed: app=other; route=${route}; ` +
        "dataset=none; dashboard=none]";

      expect(ChatViewEvent.toModelContent(storedLine)).toBe(
        ChatViewEvent.format({ app: "other", route: expected }),
      );
    },
  );
});
