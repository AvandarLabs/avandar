import type { NuxPrerequisite } from "@/components/Nux/NuxPrerequisites/NuxPrerequisite.types";

/**
 * Catch-up prerequisite for the share_dashboard milestone.
 *
 * Live completion is the first publish. Catch-up requires any dashboard in
 * the workspace whose `visibility` is no longer `draft`.
 */
export const shareDashboardPrerequisite: NuxPrerequisite = {
  milestoneKey: "share_dashboard",
  completionEvent: "dashboard.published",
  isSatisfied: (facts) => {
    return facts.hasPublishedDashboard;
  },
};
