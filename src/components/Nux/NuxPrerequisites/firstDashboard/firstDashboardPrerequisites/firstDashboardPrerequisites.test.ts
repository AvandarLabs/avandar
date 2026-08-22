import { describe, expect, it } from "vitest";

import { FIRST_DASHBOARD_PREREQUISITES } from "@/components/Nux/NuxPrerequisites/firstDashboard/firstDashboardPrerequisites/firstDashboardPrerequisites";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard/firstDashboard";

describe("FIRST_DASHBOARD_PREREQUISITES", () => {
  it("aligns every milestone completionEvent with its strategy", () => {
    FIRST_DASHBOARD_MILESTONES.forEach((milestone) => {
      const strategy = FIRST_DASHBOARD_PREREQUISITES.find((prerequisite) => {
        return prerequisite.milestoneKey === milestone.key;
      });
      expect(strategy?.completionEvent).toBe(milestone.completionEvent);
    });
  });

  it("catch-up completes share_dashboard only from a published dashboard", () => {
    const shareStrategy = FIRST_DASHBOARD_PREREQUISITES.find((prerequisite) => {
      return prerequisite.milestoneKey === "share_dashboard";
    });

    expect(shareStrategy?.completionEvent).toBe("dashboard.published");
    expect(
      shareStrategy?.isSatisfied({
        hasDataset: false,
        hasDashboard: true,
        hasPublishedDashboard: false,
      }),
    ).toBe(false);
    expect(
      shareStrategy?.isSatisfied({
        hasDataset: false,
        hasDashboard: true,
        hasPublishedDashboard: true,
      }),
    ).toBe(true);
  });
});
