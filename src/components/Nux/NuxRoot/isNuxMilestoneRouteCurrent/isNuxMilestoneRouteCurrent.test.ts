import { describe, expect, it } from "vitest";
import { isNuxMilestoneRouteCurrent } from "@/components/Nux/NuxRoot/isNuxMilestoneRouteCurrent/isNuxMilestoneRouteCurrent";

const WORKSPACE_SLUG = "acme";
const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111";

describe("isNuxMilestoneRouteCurrent", () => {
  it("is true on the import page for add_dataset", () => {
    expect(
      isNuxMilestoneRouteCurrent({
        route: { kind: "data_import" },
        pathname: `/${WORKSPACE_SLUG}/data-manager/data-import`,
        recentDashboardId: undefined,
      }),
    ).toBe(true);
  });

  it("is false on the explorer for add_dataset", () => {
    expect(
      isNuxMilestoneRouteCurrent({
        route: { kind: "data_import" },
        pathname: `/${WORKSPACE_SLUG}/data-explorer`,
        recentDashboardId: undefined,
      }),
    ).toBe(false);
  });

  it("is true on the explorer for run_query", () => {
    expect(
      isNuxMilestoneRouteCurrent({
        route: { kind: "data_explorer" },
        pathname: `/${WORKSPACE_SLUG}/data-explorer`,
        recentDashboardId: undefined,
      }),
    ).toBe(true);
  });

  it("is true on the captured dashboard editor for share_dashboard", () => {
    expect(
      isNuxMilestoneRouteCurrent({
        route: { kind: "dashboard_editor" },
        pathname: `/${WORKSPACE_SLUG}/dashboards/edit/${DASHBOARD_ID}`,
        recentDashboardId: DASHBOARD_ID,
      }),
    ).toBe(true);
  });

  it("is false on a different dashboard editor for share_dashboard", () => {
    expect(
      isNuxMilestoneRouteCurrent({
        route: { kind: "dashboard_editor" },
        pathname: `/${WORKSPACE_SLUG}/dashboards/edit/22222222-2222-4222-8222-222222222222`,
        recentDashboardId: DASHBOARD_ID,
      }),
    ).toBe(false);
  });

  it("is false on the explorer for share_dashboard", () => {
    expect(
      isNuxMilestoneRouteCurrent({
        route: { kind: "dashboard_editor" },
        pathname: `/${WORKSPACE_SLUG}/data-explorer`,
        recentDashboardId: DASHBOARD_ID,
      }),
    ).toBe(false);
  });
});
