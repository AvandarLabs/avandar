import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";

import { describe, expect, it } from "vitest";

import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/initialNuxState";
import { nuxActions } from "@/components/Nux/NuxStateManager/nuxActions/nuxActions";

const HYDRATED: NuxAppState = {
  ...INITIAL_NUX_STATE,
  progressId: "11111111-1111-4111-8111-111111111111" as NuxProgress.Id,
  status: "not_started",
  isHydrated: true,
  isCatchUpSuppressed: false,
};

describe("nuxActions.startTour", () => {
  it("marks the tutorial offered and opens the first unfinished milestone", () => {
    const nextState = nuxActions.startTour(HYDRATED);
    expect(nextState.status).toBe("in_progress");
    expect(nextState.activeMilestoneKey).toBe("add_dataset");
    expect(nextState.activeStepIndex).toBe(0);
    expect(nextState.isPanelExpanded).toBe(true);
  });

  it("opens the first unfinished milestone, not always the first", () => {
    const nextState = nuxActions.startTour({
      ...HYDRATED,
      completedMilestones: ["add_dataset"],
    });
    expect(nextState.activeMilestoneKey).toBe("run_query");
  });
});

describe("nuxActions.declineInvite", () => {
  it("marks the tutorial offered without opening anything", () => {
    const nextState = nuxActions.declineInvite(HYDRATED);
    expect(nextState.status).toBe("in_progress");
    expect(nextState.activeMilestoneKey).toBeUndefined();
    expect(nextState.isPanelExpanded).toBe(false);
  });
});

describe("nuxActions.openMilestone", () => {
  it("does not open a milestone whose prerequisites are incomplete", () => {
    const nextState = nuxActions.openMilestone(HYDRATED, "build_dashboard");
    expect(nextState).toBe(HYDRATED);
    expect(nextState.activeMilestoneKey).toBeUndefined();
  });

  it("does not open run_query before add_dataset is complete", () => {
    const nextState = nuxActions.openMilestone(HYDRATED, "run_query");
    expect(nextState).toBe(HYDRATED);
    expect(nextState.activeMilestoneKey).toBeUndefined();
  });

  it("opens run_query once add_dataset is complete", () => {
    const state = {
      ...HYDRATED,
      completedMilestones: ["add_dataset"] as const,
    };
    const nextState = nuxActions.openMilestone(state, "run_query");
    expect(nextState.activeMilestoneKey).toBe("run_query");
    expect(nextState.activeStepIndex).toBe(0);
  });

  it("opens a milestone once its prerequisites are complete", () => {
    const state = {
      ...HYDRATED,
      completedMilestones: ["add_dataset", "run_query"] as const,
    };
    const nextState = nuxActions.openMilestone(state, "build_dashboard");
    expect(nextState.activeMilestoneKey).toBe("build_dashboard");
    expect(nextState.activeStepIndex).toBe(0);
  });
});

describe("nuxActions.forgetRecentDashboardIfMatches", () => {
  it("clears the captured id and closes share_dashboard when it matches", () => {
    const state = {
      ...HYDRATED,
      recentDashboardId: "dash-1",
      activeMilestoneKey: "share_dashboard" as NuxProgress.MilestoneKey,
      activeStepIndex: 1,
    };
    const nextState = nuxActions.forgetRecentDashboardIfMatches(
      state,
      "dash-1",
    );
    expect(nextState.recentDashboardId).toBeUndefined();
    expect(nextState.activeMilestoneKey).toBeUndefined();
    expect(nextState.activeStepIndex).toBe(0);
  });

  it("is a no-op when the deleted id does not match", () => {
    const state = {
      ...HYDRATED,
      recentDashboardId: "dash-1",
    };
    expect(nuxActions.forgetRecentDashboardIfMatches(state, "dash-2")).toBe(
      state,
    );
  });
});

describe("nuxActions.restart", () => {
  it("clears progress and reopens the first milestone", () => {
    const nextState = nuxActions.restart({
      ...HYDRATED,
      status: "completed",
      completedMilestones: [
        "add_dataset",
        "run_query",
        "build_dashboard",
        "share_dashboard",
      ],
    });
    expect(nextState.status).toBe("in_progress");
    expect(nextState.completedMilestones).toEqual([]);
    expect(nextState.activeMilestoneKey).toBe("add_dataset");
  });

  it("suppresses artifact catch-up so replay is not immediately re-ticked", () => {
    const nextState = nuxActions.restart({
      ...HYDRATED,
      status: "completed",
      completedMilestones: [
        "add_dataset",
        "run_query",
        "build_dashboard",
        "share_dashboard",
      ],
    });
    expect(nextState.isCatchUpSuppressed).toBe(true);
    expect(nextState.completedMilestones).toEqual([]);
  });
});

describe("nuxActions.catchUpMilestones", () => {
  it("records every new key in one transition", () => {
    const nextState = nuxActions.catchUpMilestones(HYDRATED, [
      "add_dataset",
      "build_dashboard",
    ]);
    expect(nextState.completedMilestones).toEqual([
      "add_dataset",
      "build_dashboard",
    ]);
  });

  it("jumps the open milestone to its payoff tooltip", () => {
    const nextState = nuxActions.catchUpMilestones(
      { ...HYDRATED, activeMilestoneKey: "add_dataset", activeStepIndex: 0 },
      ["add_dataset"],
    );
    expect(nextState.activeMilestoneKey).toBe("add_dataset");
    expect(nextState.activeStepIndex).toBe(2);
  });

  it("does not reopen a dismissed tutorial", () => {
    const nextState = nuxActions.catchUpMilestones(
      { ...HYDRATED, status: "dismissed" },
      ["add_dataset"],
    );
    expect(nextState.status).toBe("dismissed");
    expect(nextState.isPanelExpanded).toBe(false);
  });

  it("returns the same state when there is nothing to add", () => {
    const state = {
      ...HYDRATED,
      completedMilestones: ["add_dataset"] as const,
    };
    expect(nuxActions.catchUpMilestones(state, ["add_dataset"])).toBe(state);
  });

  it("adds only milestones that are not already complete", () => {
    const state = {
      ...HYDRATED,
      completedMilestones: ["add_dataset"] as const,
    };
    const nextState = nuxActions.catchUpMilestones(state, [
      "add_dataset",
      "build_dashboard",
    ]);
    expect(nextState.completedMilestones).toEqual([
      "add_dataset",
      "build_dashboard",
    ]);
    expect(nextState).not.toBe(state);
  });
});

describe("nuxActions.hydrate", () => {
  it("seeds isCatchUpSuppressed from the persisted row", () => {
    const nextState = nuxActions.hydrate(INITIAL_NUX_STATE, {
      progressId: HYDRATED.progressId!,
      status: "in_progress",
      completedMilestones: [],
      isCatchUpSuppressed: true,
    });
    expect(nextState.isCatchUpSuppressed).toBe(true);
  });
});

describe("nuxActions.dismiss", () => {
  it("hides everything", () => {
    const nextState = nuxActions.dismiss({
      ...HYDRATED,
      activeMilestoneKey: "run_query",
    });
    expect(nextState.status).toBe("dismissed");
    expect(nextState.activeMilestoneKey).toBeUndefined();
    expect(nextState.isPanelExpanded).toBe(false);
  });
});

describe("nuxActions.skipActiveMilestone", () => {
  it("records the milestone so a blocked user is not stuck", () => {
    const nextState = nuxActions.skipActiveMilestone({
      ...HYDRATED,
      completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
      activeMilestoneKey: "share_dashboard",
      blockedReason: "Your plan allows 1 shared dashboard.",
    });
    expect(nextState.completedMilestones).toContain("share_dashboard");
    expect(nextState.status).toBe("completed");
    expect(nextState.blockedReason).toBeUndefined();
    // A skip means the outcome never happened, so there is no payoff tooltip
    // to advance into.
    expect(nextState.activeMilestoneKey).toBeUndefined();
  });

  it("does nothing when no milestone is open", () => {
    const state = { ...HYDRATED, activeMilestoneKey: undefined };
    expect(nuxActions.skipActiveMilestone(state)).toBe(state);
  });
});

describe("nuxActions.markMilestoneDone", () => {
  it("records the milestone without jumping to the payoff tooltip", () => {
    const nextState = nuxActions.markMilestoneDone(
      { ...HYDRATED, activeMilestoneKey: "add_dataset", activeStepIndex: 0 },
      "add_dataset",
    );
    expect(nextState.completedMilestones).toEqual(["add_dataset"]);
    expect(nextState.activeMilestoneKey).toBe("add_dataset");
    expect(nextState.activeStepIndex).toBe(0);
  });

  it("does not record the same milestone twice", () => {
    const state = {
      ...HYDRATED,
      completedMilestones: ["add_dataset"] as const,
    };
    expect(nuxActions.markMilestoneDone(state, "add_dataset")).toBe(state);
  });

  it("completes the tutorial once the last milestone is marked", () => {
    const nextState = nuxActions.markMilestoneDone(
      {
        ...HYDRATED,
        status: "in_progress",
        isPanelExpanded: true,
        completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
      },
      "share_dashboard",
    );
    expect(nextState.status).toBe("completed");
    expect(nextState.isPanelExpanded).toBe(true);
    expect(nextState.activeMilestoneKey).toBeUndefined();
  });

  it("removes the key from userUnmarkedMilestones", () => {
    const nextState = nuxActions.markMilestoneDone(
      { ...HYDRATED, userUnmarkedMilestones: ["add_dataset"] },
      "add_dataset",
    );
    expect(nextState.userUnmarkedMilestones).toEqual([]);
  });

  it("does not write over dismissed", () => {
    const nextState = nuxActions.markMilestoneDone(
      { ...HYDRATED, status: "dismissed" },
      "add_dataset",
    );
    expect(nextState.status).toBe("dismissed");
    expect(nextState.completedMilestones).toContain("add_dataset");
  });

  it("clears the blocked reason when the open milestone is marked", () => {
    const nextState = nuxActions.markMilestoneDone(
      {
        ...HYDRATED,
        activeMilestoneKey: "share_dashboard",
        blockedReason: "Your plan allows 1 shared dashboard.",
      },
      "share_dashboard",
    );
    expect(nextState.blockedReason).toBeUndefined();
    expect(nextState.activeMilestoneKey).toBe("share_dashboard");
  });
});

describe("nuxActions.unmarkMilestoneDone", () => {
  it("removes only that key", () => {
    const nextState = nuxActions.unmarkMilestoneDone(
      {
        ...HYDRATED,
        completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
      },
      "run_query",
    );
    expect(nextState.completedMilestones).toEqual([
      "add_dataset",
      "build_dashboard",
    ]);
    expect(nextState.userUnmarkedMilestones).toEqual(["run_query"]);
  });

  it("returns in_progress when a completed tutorial is unmarked", () => {
    const nextState = nuxActions.unmarkMilestoneDone(
      {
        ...HYDRATED,
        status: "completed",
        completedMilestones: [
          "add_dataset",
          "run_query",
          "build_dashboard",
          "share_dashboard",
        ],
      },
      "share_dashboard",
    );
    expect(nextState.status).toBe("in_progress");
  });

  it("does nothing when the key is not complete", () => {
    const state = {
      ...HYDRATED,
      completedMilestones: ["add_dataset"] as const,
    };
    expect(nuxActions.unmarkMilestoneDone(state, "run_query")).toBe(state);
  });
});

describe("nuxActions.clearActiveMilestone", () => {
  it("clears the tour and leaves the panel expanded", () => {
    const nextState = nuxActions.clearActiveMilestone({
      ...HYDRATED,
      activeMilestoneKey: "run_query",
      activeStepIndex: 1,
      isPanelExpanded: true,
    });
    expect(nextState.activeMilestoneKey).toBeUndefined();
    expect(nextState.activeStepIndex).toBe(0);
    expect(nextState.isPanelExpanded).toBe(true);
  });

  it("does nothing when no milestone is open", () => {
    const state = { ...HYDRATED, isPanelExpanded: true };
    expect(nuxActions.clearActiveMilestone(state)).toBe(state);
  });
});

describe("nuxActions.restart unmarked list", () => {
  it("clears userUnmarkedMilestones", () => {
    const nextState = nuxActions.restart({
      ...HYDRATED,
      userUnmarkedMilestones: ["add_dataset"],
    });
    expect(nextState.userUnmarkedMilestones).toEqual([]);
  });
});

describe("nuxActions.closeGatedPayoffOnEvent", () => {
  it("closes the add_dataset payoff when the summary tab opens", () => {
    const nextState = nuxActions.closeGatedPayoffOnEvent(
      {
        ...HYDRATED,
        status: "in_progress",
        completedMilestones: ["add_dataset"],
        activeMilestoneKey: "add_dataset",
        activeStepIndex: 2,
        isPanelExpanded: true,
      },
      "dataset.summaryOpened",
    );
    expect(nextState.activeMilestoneKey).toBeUndefined();
    expect(nextState.isPanelExpanded).toBe(true);
  });

  it("leaves the tour alone when a different step is showing", () => {
    const state = {
      ...HYDRATED,
      activeMilestoneKey: "add_dataset" as const,
      activeStepIndex: 1,
      isPanelExpanded: true,
    };
    expect(
      nuxActions.closeGatedPayoffOnEvent(state, "dataset.summaryOpened"),
    ).toBe(state);
  });
});
