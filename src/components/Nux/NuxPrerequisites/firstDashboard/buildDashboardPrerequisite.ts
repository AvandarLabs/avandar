import type { NuxPrerequisite } from "@/components/Nux/NuxPrerequisites/NuxPrerequisite.types";

/**
 * Catch-up prerequisite for the build_dashboard milestone.
 *
 * Returns true when the workspace already has at least one dashboard.
 */
export const buildDashboardPrerequisite: NuxPrerequisite = {
  milestoneKey: "build_dashboard",
  completionEvent: "dashboard.created",
  isSatisfied: (facts) => {
    return facts.hasDashboard;
  },
};
