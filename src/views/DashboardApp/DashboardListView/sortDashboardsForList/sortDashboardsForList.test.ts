import { describe, expect, it } from "vitest";
import { sortDashboardsForList } from "@/views/DashboardApp/DashboardListView/sortDashboardsForList/sortDashboardsForList";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

function makeDashboard(
  id: string,
  ownerId: string,
  updatedAt: string,
): Dashboard.T {
  return { id, ownerId, updatedAt } as unknown as Dashboard.T;
}

describe("sortDashboardsForList", () => {
  it("puts your own dashboards first, then everything else, each newest first", () => {
    const mine1 = makeDashboard("a", "me", "2026-01-01T00:00:00Z");
    const mine2 = makeDashboard("b", "me", "2026-03-01T00:00:00Z");
    const theirs = makeDashboard("c", "them", "2026-06-01T00:00:00Z");
    expect(
      sortDashboardsForList({
        dashboards: [theirs, mine1, mine2],
        currentUserId: "me",
      }).map((d) => {
        return d.id;
      }),
    ).toEqual(["b", "a", "c"]);
  });

  it("falls back to newest first when there is no current user yet", () => {
    // The profile can still be loading. With nobody to own anything, every
    // dashboard belongs to the same group and only recency can order them.
    const older = makeDashboard("a", "me", "2026-01-01T00:00:00Z");
    const newer = makeDashboard("b", "them", "2026-06-01T00:00:00Z");
    expect(
      sortDashboardsForList({
        dashboards: [older, newer],
        currentUserId: undefined,
      }).map((d) => {
        return d.id;
      }),
    ).toEqual(["b", "a"]);
  });

  it("leaves the caller's array untouched", () => {
    // The input is query-cache data in production, so sorting in place would
    // mutate state React never saw change.
    const input = [
      makeDashboard("a", "them", "2026-01-01T00:00:00Z"),
      makeDashboard("b", "me", "2026-03-01T00:00:00Z"),
    ];
    const result = sortDashboardsForList({
      dashboards: input,
      currentUserId: "me",
    });
    expect(
      input.map((d) => {
        return d.id;
      }),
    ).toEqual(["a", "b"]);
    expect(result).not.toBe(input);
  });

  it("keeps equal timestamps in their original order", () => {
    // `updatedAt` has second-level ties in practice, and an unstable tiebreak
    // would reshuffle the grid on every unrelated re-render.
    const first = makeDashboard("a", "me", "2026-05-01T00:00:00Z");
    const second = makeDashboard("b", "me", "2026-05-01T00:00:00Z");
    const third = makeDashboard("c", "me", "2026-05-01T00:00:00Z");
    expect(
      sortDashboardsForList({
        dashboards: [first, second, third],
        currentUserId: "me",
      }).map((d) => {
        return d.id;
      }),
    ).toEqual(["a", "b", "c"]);
  });

  it("orders by instant, not by the digits of the timestamp", () => {
    // A non-UTC offset sorts wrong under text comparison: "2026-05-01T09:00"
    // in +05:00 is EARLIER than "2026-05-01T06:00" in UTC, but reads later.
    const earlierInstant = makeDashboard(
      "a",
      "me",
      "2026-05-01T09:00:00+05:00",
    );
    const laterInstant = makeDashboard("b", "me", "2026-05-01T06:00:00Z");
    expect(
      sortDashboardsForList({
        dashboards: [earlierInstant, laterInstant],
        currentUserId: "me",
      }).map((d) => {
        return d.id;
      }),
    ).toEqual(["b", "a"]);
  });
});
