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
      sortDashboardsForList([theirs, mine1, mine2], "me").map((d) => {
        return d.id;
      }),
    ).toEqual(["b", "a", "c"]);
  });
});
