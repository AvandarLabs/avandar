import { describe, expect, it } from "vitest";
import { nuxActions } from "@/components/Nux/NuxStateManager/nuxActions/nuxActions";
import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";

const HYDRATED: NuxAppState = {
  ...INITIAL_NUX_STATE,
  progressId: "11111111-1111-4111-8111-111111111111" as NuxProgress.Id,
  status: "not_started",
  isHydrated: true,
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

describe("nuxActions.completeMilestone", () => {
  it("records the milestone and closes its tooltips on the last step", () => {
    const nextState = nuxActions.completeMilestone(
      { ...HYDRATED, activeMilestoneKey: "add_dataset", activeStepIndex: 2 },
      { key: "add_dataset", datasetId: "ds1" },
    );
    expect(nextState.completedMilestones).toEqual(["add_dataset"]);
    expect(nextState.activeMilestoneKey).toBeUndefined();
    expect(nextState.recentDatasetId).toBe("ds1");
  });

  // The payoff tooltip is written to be read AFTER the outcome lands, so
  // completing a milestone mid-run must advance rather than close. Closing
  // here would mean three of the ten tooltips could never render.
  it("advances to the payoff tooltip when the milestone has one left", () => {
    const nextState = nuxActions.completeMilestone(
      { ...HYDRATED, activeMilestoneKey: "add_dataset", activeStepIndex: 1 },
      { key: "add_dataset", datasetId: "ds1" },
    );
    expect(nextState.completedMilestones).toEqual(["add_dataset"]);
    expect(nextState.activeMilestoneKey).toBe("add_dataset");
    expect(nextState.activeStepIndex).toBe(2);
  });

  it("advances the final milestone to its role-select tooltip", () => {
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
