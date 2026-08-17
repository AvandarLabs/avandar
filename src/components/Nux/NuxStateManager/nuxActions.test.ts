import { describe, expect, it } from "vitest";
import { nuxActions } from "@/components/Nux/NuxStateManager/nuxActions";
import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";

// `progressId` is a branded UUID, so a plain string needs the double cast.
const HYDRATED: NuxAppState = {
  ...INITIAL_NUX_STATE,
  progressId:
    "11111111-1111-4111-8111-111111111111" as unknown as NuxAppState["progressId"],
  status: "not_started",
  isHydrated: true,
};

describe("nuxActions.startTour", () => {
  it("marks the tutorial offered and opens the first unfinished milestone", () => {
    const next = nuxActions.startTour(HYDRATED);
    expect(next.status).toBe("in_progress");
    expect(next.activeMilestoneKey).toBe("add_dataset");
    expect(next.activeStepIndex).toBe(0);
    expect(next.isPanelExpanded).toBe(true);
  });

  it("opens the first unfinished milestone, not always the first", () => {
    const next = nuxActions.startTour({
      ...HYDRATED,
      completedMilestones: ["add_dataset"],
    });
    expect(next.activeMilestoneKey).toBe("run_query");
  });
});

describe("nuxActions.declineInvite", () => {
  it("marks the tutorial offered without opening anything", () => {
    const next = nuxActions.declineInvite(HYDRATED);
    expect(next.status).toBe("in_progress");
    expect(next.activeMilestoneKey).toBeUndefined();
    expect(next.isPanelExpanded).toBe(false);
  });
});

describe("nuxActions.completeMilestone", () => {
  it("records the milestone and closes its tooltips on the last step", () => {
    const next = nuxActions.completeMilestone(
      { ...HYDRATED, activeMilestoneKey: "add_dataset", activeStepIndex: 2 },
      { key: "add_dataset", datasetId: "ds1" },
    );
    expect(next.completedMilestones).toEqual(["add_dataset"]);
    expect(next.activeMilestoneKey).toBeUndefined();
    expect(next.recentDatasetId).toBe("ds1");
  });

  // The payoff tooltip is written to be read AFTER the outcome lands, so
  // completing a milestone mid-run must advance rather than close. Closing
  // here would mean three of the ten tooltips could never render.
  it("advances to the payoff tooltip when the milestone has one left", () => {
    const next = nuxActions.completeMilestone(
      { ...HYDRATED, activeMilestoneKey: "add_dataset", activeStepIndex: 1 },
      { key: "add_dataset", datasetId: "ds1" },
    );
    expect(next.completedMilestones).toEqual(["add_dataset"]);
    expect(next.activeMilestoneKey).toBe("add_dataset");
    expect(next.activeStepIndex).toBe(2);
  });

  it("advances the final milestone to its role-select tooltip", () => {
    const next = nuxActions.completeMilestone(
      {
        ...HYDRATED,
        completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
        activeMilestoneKey: "share_dashboard",
        activeStepIndex: 1,
      },
      { key: "share_dashboard" },
    );
    expect(next.activeMilestoneKey).toBe("share_dashboard");
    expect(next.activeStepIndex).toBe(2);
    expect(next.status).toBe("completed");
  });

  it("does not record the same milestone twice", () => {
    const next = nuxActions.completeMilestone(
      { ...HYDRATED, completedMilestones: ["add_dataset"] },
      { key: "add_dataset" },
    );
    expect(next.completedMilestones).toEqual(["add_dataset"]);
  });

  it("completes the tutorial once the last milestone lands", () => {
    const next = nuxActions.completeMilestone(
      {
        ...HYDRATED,
        status: "in_progress",
        completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
      },
      { key: "share_dashboard" },
    );
    expect(next.status).toBe("completed");
  });

  it("ignores a completion for a milestone that is already done", () => {
    const state: NuxAppState = {
      ...HYDRATED,
      completedMilestones: ["add_dataset"],
      activeMilestoneKey: "run_query",
      activeStepIndex: 1,
    };
    const next = nuxActions.completeMilestone(state, { key: "add_dataset" });
    expect(next.activeMilestoneKey).toBe("run_query");
    expect(next.activeStepIndex).toBe(1);
  });
});

describe("nuxActions.restart", () => {
  it("clears progress and reopens the first milestone", () => {
    const next = nuxActions.restart({
      ...HYDRATED,
      status: "completed",
      completedMilestones: [
        "add_dataset",
        "run_query",
        "build_dashboard",
        "share_dashboard",
      ],
    });
    expect(next.status).toBe("in_progress");
    expect(next.completedMilestones).toEqual([]);
    expect(next.activeMilestoneKey).toBe("add_dataset");
  });
});

describe("nuxActions.dismiss", () => {
  it("hides everything", () => {
    const next = nuxActions.dismiss({
      ...HYDRATED,
      activeMilestoneKey: "run_query",
    });
    expect(next.status).toBe("dismissed");
    expect(next.activeMilestoneKey).toBeUndefined();
    expect(next.isPanelExpanded).toBe(false);
  });
});

describe("nuxActions.skipActiveMilestone", () => {
  it("records the milestone so a blocked user is not stuck", () => {
    const next = nuxActions.skipActiveMilestone({
      ...HYDRATED,
      completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
      activeMilestoneKey: "share_dashboard",
      blockedReason: "Your plan allows 1 shared dashboard.",
    });
    expect(next.completedMilestones).toContain("share_dashboard");
    expect(next.status).toBe("completed");
    expect(next.blockedReason).toBeUndefined();
    // A skip means the outcome never happened, so there is no payoff tooltip
    // to advance into.
    expect(next.activeMilestoneKey).toBeUndefined();
  });

  it("does nothing when no milestone is open", () => {
    const state = { ...HYDRATED, activeMilestoneKey: undefined };
    expect(nuxActions.skipActiveMilestone(state)).toBe(state);
  });
});
