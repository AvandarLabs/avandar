import { describe, expect, it } from "vitest";
import { shareDashboardPrerequisite } from "@/components/Nux/NuxPrerequisites/firstDashboard/shareDashboardPrerequisite/shareDashboardPrerequisite";
import { NuxPrerequisiteJudge } from "@/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge/NuxPrerequisiteJudge";
import type { NuxEvent } from "@/components/Nux/NuxEvents/NuxEvents";
import type { NuxPrerequisiteFacts } from "@/components/Nux/NuxPrerequisites/NuxPrerequisite.types";

const EMPTY_FACTS: NuxPrerequisiteFacts = {
  hasDataset: false,
  hasDashboard: false,
  hasPublishedDashboard: false,
};

describe("shareDashboardPrerequisite", () => {
  it("matches dashboard.published live events", () => {
    const event: NuxEvent = {
      name: "dashboard.published",
      payload: { dashboardId: "dash-1" },
    };

    expect(
      NuxPrerequisiteJudge.matchesLiveEvent(event, shareDashboardPrerequisite),
    ).toBe(true);
  });

  it("is satisfied when the workspace already has a published dashboard", () => {
    expect(
      shareDashboardPrerequisite.isSatisfied({
        ...EMPTY_FACTS,
        hasPublishedDashboard: true,
      }),
    ).toBe(true);
  });

  it("is not satisfied by a draft dashboard alone", () => {
    expect(
      shareDashboardPrerequisite.isSatisfied({
        ...EMPTY_FACTS,
        hasDashboard: true,
      }),
    ).toBe(false);
  });
});
