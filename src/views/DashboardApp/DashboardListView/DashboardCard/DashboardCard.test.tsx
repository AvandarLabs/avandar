import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { DashboardCard } from "@/views/DashboardApp/DashboardListView/DashboardCard/DashboardCard";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

function makeDashboard(visibility: Dashboard.Visibility): Dashboard.T {
  return {
    id: "11111111-2222-4333-8444-555555555555",
    name: "Q3 Revenue",
    description: undefined,
    visibility,
    updatedAt: "2026-08-01T00:00:00Z",
  } as unknown as Dashboard.T;
}

describe("DashboardCard", () => {
  it("badges a dashboard someone else owns", () => {
    render(
      <DashboardCard
        dashboard={makeDashboard("draft")}
        isOwnedByCurrentUser={false}
      />,
    );
    expect(screen.getByText("Shared with you")).toBeInTheDocument();
  });

  it("does not badge your own dashboards, which would be noise on every card", () => {
    render(
      <DashboardCard dashboard={makeDashboard("draft")} isOwnedByCurrentUser />,
    );
    expect(screen.queryByText("Shared with you")).toBeNull();
  });

  it("badges a workspace-published dashboard", () => {
    render(
      <DashboardCard
        dashboard={makeDashboard("workspace")}
        isOwnedByCurrentUser
      />,
    );
    expect(screen.getByText("Published to workspace")).toBeInTheDocument();
  });

  it("badges a public dashboard, and both badges compose", () => {
    render(
      <DashboardCard
        dashboard={makeDashboard("public")}
        isOwnedByCurrentUser={false}
      />,
    );
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText("Shared with you")).toBeInTheDocument();
  });
});
