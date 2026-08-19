import { describe, expect, it } from "vitest";
import { NuxExplorerSaveMenu } from "@/components/Nux/NuxTour/NuxExplorerSaveMenu/NuxExplorerSaveMenu";

const HAS_RESULTS = {
  explorerHasQueryResults: true,
  generalAccessIsWorkspace: false,
} as const;
const NO_RESULTS = {
  explorerHasQueryResults: false,
  generalAccessIsWorkspace: false,
} as const;

describe("NuxExplorerSaveMenu.shouldHoldOpen", () => {
  it("holds the menu open on the Save to dashboard item tooltip", () => {
    expect(
      NuxExplorerSaveMenu.shouldHoldOpen({
        activeMilestoneKey: "build_dashboard",
        activeStepIndex: 1,
        facts: HAS_RESULTS,
      }),
    ).toBe(true);
  });

  it("holds the menu open at the unfiltered Save to dashboard index when there are no results", () => {
    expect(
      NuxExplorerSaveMenu.shouldHoldOpen({
        activeMilestoneKey: "build_dashboard",
        activeStepIndex: 2,
        facts: NO_RESULTS,
      }),
    ).toBe(true);
  });

  it("does not hold the menu open on the Save trigger tooltip", () => {
    expect(
      NuxExplorerSaveMenu.shouldHoldOpen({
        activeMilestoneKey: "build_dashboard",
        activeStepIndex: 0,
        facts: HAS_RESULTS,
      }),
    ).toBe(false);
  });

  it("does not hold the menu open on the create-modal tooltip", () => {
    expect(
      NuxExplorerSaveMenu.shouldHoldOpen({
        activeMilestoneKey: "build_dashboard",
        activeStepIndex: 2,
        facts: HAS_RESULTS,
      }),
    ).toBe(false);
  });

  it("does not hold the menu open for other milestones", () => {
    expect(
      NuxExplorerSaveMenu.shouldHoldOpen({
        activeMilestoneKey: "run_query",
        activeStepIndex: 1,
        facts: HAS_RESULTS,
      }),
    ).toBe(false);
  });
});

describe("NuxExplorerSaveMenu.shouldForceCreateMode", () => {
  it("forces create mode while the build_dashboard tour is open", () => {
    expect(
      NuxExplorerSaveMenu.shouldForceCreateMode({
        activeMilestoneKey: "build_dashboard",
      }),
    ).toBe(true);
  });

  it("leaves the modal alone when that tour is not open", () => {
    expect(
      NuxExplorerSaveMenu.shouldForceCreateMode({
        activeMilestoneKey: "run_query",
      }),
    ).toBe(false);
    expect(
      NuxExplorerSaveMenu.shouldForceCreateMode({
        activeMilestoneKey: undefined,
      }),
    ).toBe(false);
  });
});
