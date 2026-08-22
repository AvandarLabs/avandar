import { describe, expect, it } from "vitest";
import { addDatasetPrerequisite } from "@/components/Nux/NuxPrerequisites/firstDashboard/addDatasetPrerequisite";
import { FIRST_DASHBOARD_PREREQUISITES } from "@/components/Nux/NuxPrerequisites/firstDashboard/firstDashboardPrerequisites/firstDashboardPrerequisites";
import { runQueryPrerequisite } from "@/components/Nux/NuxPrerequisites/firstDashboard/runQueryPrerequisite/runQueryPrerequisite";
import { shareDashboardPrerequisite } from "@/components/Nux/NuxPrerequisites/firstDashboard/shareDashboardPrerequisite/shareDashboardPrerequisite";
import { NuxPrerequisiteJudge } from "@/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge/NuxPrerequisiteJudge";
import type { NuxEvent } from "@/components/Nux/NuxEvents/NuxEvents";
import type { NuxPrerequisiteFacts } from "@/components/Nux/NuxPrerequisites/NuxPrerequisite.types";

const EMPTY_FACTS: NuxPrerequisiteFacts = {
  hasDataset: false,
  hasDashboard: false,
  hasPublishedDashboard: false,
};

describe("NuxPrerequisiteJudge.getCatchUpKeys", () => {
  it("returns nothing for empty facts", () => {
    expect(
      NuxPrerequisiteJudge.getCatchUpKeys({
        facts: EMPTY_FACTS,
        completedMilestones: [],
        userUnmarkedMilestones: [],
        prerequisites: FIRST_DASHBOARD_PREREQUISITES,
        isCatchUpSuppressed: false,
      }),
    ).toEqual([]);
  });

  it("completes only add_dataset when a dataset exists", () => {
    expect(
      NuxPrerequisiteJudge.getCatchUpKeys({
        facts: { ...EMPTY_FACTS, hasDataset: true },
        completedMilestones: [],
        userUnmarkedMilestones: [],
        prerequisites: FIRST_DASHBOARD_PREREQUISITES,
        isCatchUpSuppressed: false,
      }),
    ).toEqual(["add_dataset"]);
  });

  it("does not complete run_query when a dashboard exists", () => {
    expect(
      NuxPrerequisiteJudge.getCatchUpKeys({
        facts: { ...EMPTY_FACTS, hasDashboard: true },
        completedMilestones: [],
        userUnmarkedMilestones: [],
        prerequisites: FIRST_DASHBOARD_PREREQUISITES,
        isCatchUpSuppressed: false,
      }),
    ).toEqual(["build_dashboard"]);
  });

  it("does not complete share_dashboard from a draft dashboard alone", () => {
    expect(
      NuxPrerequisiteJudge.getCatchUpKeys({
        facts: { ...EMPTY_FACTS, hasDashboard: true },
        completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
        userUnmarkedMilestones: [],
        prerequisites: FIRST_DASHBOARD_PREREQUISITES,
        isCatchUpSuppressed: false,
      }),
    ).toEqual([]);
  });

  it("completes each artifact independently", () => {
    expect(
      NuxPrerequisiteJudge.getCatchUpKeys({
        facts: {
          hasDataset: true,
          hasDashboard: true,
          hasPublishedDashboard: true,
        },
        completedMilestones: [],
        userUnmarkedMilestones: [],
        prerequisites: FIRST_DASHBOARD_PREREQUISITES,
        isCatchUpSuppressed: false,
      }),
    ).toEqual(["add_dataset", "build_dashboard", "share_dashboard"]);
  });

  it("does not re-add an already completed milestone", () => {
    expect(
      NuxPrerequisiteJudge.getCatchUpKeys({
        facts: { ...EMPTY_FACTS, hasDataset: true },
        completedMilestones: ["add_dataset"],
        userUnmarkedMilestones: [],
        prerequisites: FIRST_DASHBOARD_PREREQUISITES,
        isCatchUpSuppressed: false,
      }),
    ).toEqual([]);
  });

  it("returns nothing when catch-up is suppressed", () => {
    expect(
      NuxPrerequisiteJudge.getCatchUpKeys({
        facts: {
          hasDataset: true,
          hasDashboard: true,
          hasPublishedDashboard: true,
        },
        completedMilestones: [],
        userUnmarkedMilestones: [],
        prerequisites: FIRST_DASHBOARD_PREREQUISITES,
        isCatchUpSuppressed: true,
      }),
    ).toEqual([]);
  });

  it("does not catch up a key the user unmarked this session", () => {
    expect(
      NuxPrerequisiteJudge.getCatchUpKeys({
        facts: { ...EMPTY_FACTS, hasDataset: true },
        completedMilestones: [],
        userUnmarkedMilestones: ["add_dataset"],
        prerequisites: FIRST_DASHBOARD_PREREQUISITES,
        isCatchUpSuppressed: false,
      }),
    ).toEqual([]);
  });
});

describe("NuxPrerequisiteJudge.matchesLiveEvent", () => {
  it("matches query.succeeded with sql_submit and rows for run_query", () => {
    const event: NuxEvent = {
      name: "query.succeeded",
      payload: { trigger: "sql_submit", rowCount: 3 },
    };

    expect(
      NuxPrerequisiteJudge.matchesLiveEvent(event, runQueryPrerequisite),
    ).toBe(true);
  });

  it("does not match query.succeeded with url_hydration for run_query", () => {
    const event: NuxEvent = {
      name: "query.succeeded",
      payload: { trigger: "url_hydration", rowCount: 10 },
    };

    expect(
      NuxPrerequisiteJudge.matchesLiveEvent(event, runQueryPrerequisite),
    ).toBe(false);
  });

  it("matches dataset.saved for add_dataset", () => {
    const event: NuxEvent = {
      name: "dataset.saved",
      payload: { datasetId: "dataset-1" },
    };

    expect(
      NuxPrerequisiteJudge.matchesLiveEvent(event, addDatasetPrerequisite),
    ).toBe(true);
  });

  it("does not match a different event name for add_dataset", () => {
    const event: NuxEvent = {
      name: "query.succeeded",
      payload: { trigger: "sql_submit", rowCount: 3 },
    };

    expect(
      NuxPrerequisiteJudge.matchesLiveEvent(event, addDatasetPrerequisite),
    ).toBe(false);
  });

  it("matches dashboard.published for share_dashboard", () => {
    const event: NuxEvent = {
      name: "dashboard.published",
      payload: { dashboardId: "dash-1" },
    };

    expect(
      NuxPrerequisiteJudge.matchesLiveEvent(event, shareDashboardPrerequisite),
    ).toBe(true);
  });
});
