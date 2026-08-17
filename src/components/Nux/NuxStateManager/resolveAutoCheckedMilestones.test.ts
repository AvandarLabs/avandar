import { describe, expect, it } from "vitest";
import { resolveAutoCheckedMilestones } from "@/components/Nux/NuxStateManager/resolveAutoCheckedMilestones";

describe("resolveAutoCheckedMilestones", () => {
  it("checks nothing for an empty workspace", () => {
    expect(
      resolveAutoCheckedMilestones({
        hasDataset: false,
        hasDashboard: false,
        hasWorkspaceSharedDashboard: false,
      }),
    ).toEqual([]);
  });

  it("checks the first milestone when a dataset exists", () => {
    expect(
      resolveAutoCheckedMilestones({
        hasDataset: true,
        hasDashboard: false,
        hasWorkspaceSharedDashboard: false,
      }),
    ).toEqual(["add_dataset"]);
  });

  it("checks the first three when a dashboard exists", () => {
    expect(
      resolveAutoCheckedMilestones({
        hasDataset: true,
        hasDashboard: true,
        hasWorkspaceSharedDashboard: false,
      }),
    ).toEqual(["add_dataset", "run_query", "build_dashboard"]);
  });

  it("checks everything when a workspace-shared dashboard exists", () => {
    expect(
      resolveAutoCheckedMilestones({
        hasDataset: true,
        hasDashboard: true,
        hasWorkspaceSharedDashboard: true,
      }),
    ).toEqual([
      "add_dataset",
      "run_query",
      "build_dashboard",
      "share_dashboard",
    ]);
  });

  it("checks the whole prefix even when an earlier artifact is missing", () => {
    expect(
      resolveAutoCheckedMilestones({
        hasDataset: false,
        hasDashboard: true,
        hasWorkspaceSharedDashboard: false,
      }),
    ).toEqual(["add_dataset", "run_query", "build_dashboard"]);
  });
});
