import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";

import { afterEach, describe, expect, it } from "vitest";

import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/initialNuxState";
import { nuxActions } from "@/components/Nux/NuxStateManager/nuxActions/nuxActions";
import { NuxStepFactsStore } from "@/components/Nux/NuxTour/NuxStepFactsStore/NuxStepFactsStore";

const HYDRATED: NuxAppState = {
  ...INITIAL_NUX_STATE,
  progressId: "11111111-1111-4111-8111-111111111111" as NuxProgress.Id,
  status: "not_started",
  isHydrated: true,
  isCatchUpSuppressed: false,
};

describe("nuxActions.completeMilestone", () => {
  afterEach(() => {
    NuxStepFactsStore.setExplorerHasQueryResults(false);
    NuxStepFactsStore.setGeneralAccessIsWorkspace(false);
  });

  it("records the milestone and closes its tooltips on the last step", () => {
    const nextState = nuxActions.completeMilestone(
      { ...HYDRATED, activeMilestoneKey: "add_dataset", activeStepIndex: 2 },
      { key: "add_dataset", datasetId: "ds1" },
    );
    expect(nextState.completedMilestones).toEqual(["add_dataset"]);
    expect(nextState.activeMilestoneKey).toBeUndefined();
    expect(nextState.recentDatasetId).toBe("ds1");
  });

  it("closes the tour when dashboard.created lands on the create-button tooltip", () => {
    NuxStepFactsStore.setExplorerHasQueryResults(true);
    const nextState = nuxActions.completeMilestone(
      {
        ...HYDRATED,
        completedMilestones: ["add_dataset", "run_query"],
        activeMilestoneKey: "build_dashboard",
        activeStepIndex: 2,
      },
      { key: "build_dashboard" },
    );
    expect(nextState.completedMilestones).toEqual([
      "add_dataset",
      "run_query",
      "build_dashboard",
    ]);
    expect(nextState.activeMilestoneKey).toBeUndefined();
  });

  // The payoff tooltip is written to be read AFTER the outcome lands, so
  // completing a milestone mid-run must advance rather than close. Closing
  // here would mean the payoff tooltips could never render.
  it("advances to the payoff tooltip when the milestone has one left", () => {
    const nextState = nuxActions.completeMilestone(
      { ...HYDRATED, activeMilestoneKey: "add_dataset", activeStepIndex: 1 },
      { key: "add_dataset", datasetId: "ds1" },
    );
    expect(nextState.completedMilestones).toEqual(["add_dataset"]);
    expect(nextState.activeMilestoneKey).toBe("add_dataset");
    expect(nextState.activeStepIndex).toBe(2);
  });

  it("skips to the payoff when the outcome lands before the save tooltip", () => {
    // Drag-and-drop opens the import form in a modal. The user can save
    // without ever clicking Next, so they are still on the first tooltip.
    // Advancing by one would spotlight the now-unmounted import form.
    const nextState = nuxActions.completeMilestone(
      { ...HYDRATED, activeMilestoneKey: "add_dataset", activeStepIndex: 0 },
      { key: "add_dataset", datasetId: "ds1" },
    );
    expect(nextState.activeMilestoneKey).toBe("add_dataset");
    expect(nextState.activeStepIndex).toBe(2);
  });

  it("advances share_dashboard to its publish tooltip when workspace access is selected", () => {
    NuxStepFactsStore.setGeneralAccessIsWorkspace(true);
    const nextState = nuxActions.completeMilestone(
      {
        ...HYDRATED,
        completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
        activeMilestoneKey: "share_dashboard",
        activeStepIndex: 1,
      },
      { key: "share_dashboard" },
    );
    expect(nextState.activeMilestoneKey).toBe("share_dashboard");
    expect(nextState.activeStepIndex).toBe(3);
    expect(nextState.status).toBe("completed");
  });

  it("advances share_dashboard to its publish tooltip when the role picker is hidden", () => {
    NuxStepFactsStore.setGeneralAccessIsWorkspace(false);
    const nextState = nuxActions.completeMilestone(
      {
        ...HYDRATED,
        completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
        activeMilestoneKey: "share_dashboard",
        activeStepIndex: 1,
      },
      { key: "share_dashboard" },
    );
    expect(nextState.activeMilestoneKey).toBe("share_dashboard");
    expect(nextState.activeStepIndex).toBe(2);
    expect(nextState.status).toBe("completed");
  });

  it("closes the share tour when the publish tooltip is the one that completes", () => {
    NuxStepFactsStore.setGeneralAccessIsWorkspace(true);
    const nextState = nuxActions.completeMilestone(
      {
        ...HYDRATED,
        completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
        activeMilestoneKey: "share_dashboard",
        activeStepIndex: 3,
      },
      { key: "share_dashboard" },
    );
    expect(nextState.activeMilestoneKey).toBeUndefined();
    expect(nextState.status).toBe("completed");
  });

  it("does not record the same milestone twice", () => {
    const nextState = nuxActions.completeMilestone(
      { ...HYDRATED, completedMilestones: ["add_dataset"] },
      { key: "add_dataset" },
    );
    expect(nextState.completedMilestones).toEqual(["add_dataset"]);
  });

  it("completes the tutorial once the last milestone lands", () => {
    const nextState = nuxActions.completeMilestone(
      {
        ...HYDRATED,
        status: "in_progress",
        completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
      },
      { key: "share_dashboard" },
    );
    expect(nextState.status).toBe("completed");
  });

  it("ignores a completion for a milestone that is already done", () => {
    const state: NuxAppState = {
      ...HYDRATED,
      completedMilestones: ["add_dataset"],
      activeMilestoneKey: "run_query",
      activeStepIndex: 1,
    };
    const nextState = nuxActions.completeMilestone(state, {
      key: "add_dataset",
    });
    expect(nextState.activeMilestoneKey).toBe("run_query");
    expect(nextState.activeStepIndex).toBe(1);
  });

  it("still captures a new dashboard id after build_dashboard is already done", () => {
    const state: NuxAppState = {
      ...HYDRATED,
      completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
      recentDashboardId: undefined,
    };
    const nextState = nuxActions.completeMilestone(state, {
      key: "build_dashboard",
      dashboardId: "dash-2",
    });
    expect(nextState.completedMilestones).toEqual([
      "add_dataset",
      "run_query",
      "build_dashboard",
    ]);
    expect(nextState.recentDashboardId).toBe("dash-2");
  });
});

describe("nuxActions.completeMilestone after a dismissal", () => {
  it("records the milestone but keeps the tutorial dismissed", () => {
    const nextState = nuxActions.completeMilestone(
      { ...HYDRATED, status: "dismissed" },
      { key: "add_dataset" },
    );
    // Recording keeps the persisted row truthful, but a dismissal must survive:
    // otherwise a later dataset upload would pop the checklist back open and
    // the write-back would overwrite `dismissed` for good.
    expect(nextState.completedMilestones).toContain("add_dataset");
    expect(nextState.status).toBe("dismissed");
    expect(nextState.isPanelExpanded).toBe(false);
  });

  it("keeps it dismissed even when that was the last milestone", () => {
    const nextState = nuxActions.completeMilestone(
      {
        ...HYDRATED,
        status: "dismissed",
        completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
      },
      { key: "share_dashboard" },
    );
    expect(nextState.status).toBe("dismissed");
    expect(nextState.isPanelExpanded).toBe(false);
  });
});

describe("nuxActions.completeMilestone unmarked list", () => {
  it("removes a live-completed key from userUnmarkedMilestones", () => {
    const nextState = nuxActions.completeMilestone(
      { ...HYDRATED, userUnmarkedMilestones: ["add_dataset"] },
      { key: "add_dataset" },
    );
    expect(nextState.userUnmarkedMilestones).toEqual([]);
  });
});
