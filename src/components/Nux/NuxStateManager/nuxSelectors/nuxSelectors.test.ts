import { describe, expect, it } from "vitest";
import { nuxSelectors } from "@/components/Nux/NuxStateManager/nuxSelectors/nuxSelectors";

describe("getFirstUnfinishedMilestoneKey", () => {
  it("returns the first milestone when nothing is done", () => {
    expect(nuxSelectors.getFirstUnfinishedMilestoneKey([])).toBe("add_dataset");
  });

  it("skips completed milestones", () => {
    expect(nuxSelectors.getFirstUnfinishedMilestoneKey(["add_dataset"])).toBe(
      "run_query",
    );
  });

  it("respects tutorial order over completion order", () => {
    expect(
      nuxSelectors.getFirstUnfinishedMilestoneKey(["build_dashboard"]),
    ).toBe("add_dataset");
  });

  it("returns undefined when everything is done", () => {
    expect(
      nuxSelectors.getFirstUnfinishedMilestoneKey([
        "add_dataset",
        "run_query",
        "build_dashboard",
        "share_dashboard",
      ]),
    ).toBeUndefined();
  });
});

describe("areAllMilestonesComplete", () => {
  it("is false when nothing is done", () => {
    expect(nuxSelectors.areAllMilestonesComplete([])).toBe(false);
  });

  it("is false for a partial run", () => {
    expect(nuxSelectors.areAllMilestonesComplete(["add_dataset"])).toBe(false);
  });

  it("is true for a full run", () => {
    expect(
      nuxSelectors.areAllMilestonesComplete([
        "add_dataset",
        "run_query",
        "build_dashboard",
        "share_dashboard",
      ]),
    ).toBe(true);
  });
});

describe("areMilestonePrerequisitesMet", () => {
  it("is true when the milestone lists no prerequisites", () => {
    expect(nuxSelectors.areMilestonePrerequisitesMet({}, [])).toBe(true);
  });

  it("is false until every listed prerequisite is complete", () => {
    expect(
      nuxSelectors.areMilestonePrerequisitesMet(
        { prerequisites: ["run_query"] },
        [],
      ),
    ).toBe(false);
    expect(
      nuxSelectors.areMilestonePrerequisitesMet(
        { prerequisites: ["run_query"] },
        ["add_dataset"],
      ),
    ).toBe(false);
  });

  it("is true once the listed prerequisites are complete", () => {
    expect(
      nuxSelectors.areMilestonePrerequisitesMet(
        { prerequisites: ["run_query"] },
        ["add_dataset", "run_query"],
      ),
    ).toBe(true);
  });
});
