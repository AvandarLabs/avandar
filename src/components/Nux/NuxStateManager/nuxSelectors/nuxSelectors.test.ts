import { describe, expect, it } from "vitest";
import {
  areAllMilestonesComplete,
  getFirstUnfinishedMilestoneKey,
} from "@/components/Nux/NuxStateManager/nuxSelectors/nuxSelectors";

describe("getFirstUnfinishedMilestoneKey", () => {
  it("returns the first milestone when nothing is done", () => {
    expect(getFirstUnfinishedMilestoneKey([])).toBe("add_dataset");
  });

  it("skips completed milestones", () => {
    expect(getFirstUnfinishedMilestoneKey(["add_dataset"])).toBe("run_query");
  });

  it("respects tutorial order over completion order", () => {
    expect(getFirstUnfinishedMilestoneKey(["build_dashboard"])).toBe(
      "add_dataset",
    );
  });

  it("returns undefined when everything is done", () => {
    expect(
      getFirstUnfinishedMilestoneKey([
        "add_dataset",
        "run_query",
        "build_dashboard",
        "share_dashboard",
      ]),
    ).toBeUndefined();
  });
});

describe("areAllMilestonesComplete", () => {
  it("is false for a partial run", () => {
    expect(areAllMilestonesComplete(["add_dataset"])).toBe(false);
  });

  it("is true for a full run", () => {
    expect(
      areAllMilestonesComplete([
        "add_dataset",
        "run_query",
        "build_dashboard",
        "share_dashboard",
      ]),
    ).toBe(true);
  });
});
