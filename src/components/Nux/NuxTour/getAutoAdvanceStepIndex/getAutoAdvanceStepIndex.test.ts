import { describe, expect, it } from "vitest";

import { getAutoAdvanceStepIndex } from "@/components/Nux/NuxTour/getAutoAdvanceStepIndex/getAutoAdvanceStepIndex";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard/firstDashboard";

describe("getAutoAdvanceStepIndex", () => {
  it("advances when the next tooltip's target is the current step's gate and it is present", () => {
    const addDataset = FIRST_DASHBOARD_MILESTONES[0]!;
    expect(
      getAutoAdvanceStepIndex({
        steps: addDataset.steps,
        activeStepIndex: 0,
        isGateAnchorPresent: true,
      }),
    ).toBe(1);
  });

  it("does not advance while the gated target is missing", () => {
    const addDataset = FIRST_DASHBOARD_MILESTONES[0]!;
    expect(
      getAutoAdvanceStepIndex({
        steps: addDataset.steps,
        activeStepIndex: 0,
        isGateAnchorPresent: false,
      }),
    ).toBeUndefined();
  });

  it("advances once the gated anchor is present, even if the next tooltip points elsewhere", () => {
    const buildDashboard = FIRST_DASHBOARD_MILESTONES[2]!;
    expect(
      getAutoAdvanceStepIndex({
        steps: buildDashboard.steps,
        activeStepIndex: 1,
        isGateAnchorPresent: true,
      }),
    ).toBe(2);
  });

  it("does not advance again after the user has already reached a later tooltip", () => {
    const addDataset = FIRST_DASHBOARD_MILESTONES[0]!;
    expect(
      getAutoAdvanceStepIndex({
        steps: addDataset.steps,
        activeStepIndex: 0,
        isGateAnchorPresent: true,
        highestStepIndexReached: 1,
      }),
    ).toBeUndefined();
  });
});
