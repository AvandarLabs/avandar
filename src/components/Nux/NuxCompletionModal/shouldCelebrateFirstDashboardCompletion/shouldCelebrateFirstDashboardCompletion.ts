import { nuxSelectors } from "@/components/Nux/NuxStateManager/nuxSelectors/nuxSelectors";
import type { NuxEventName } from "@/components/Nux/NuxEvents/NuxEvents";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";

type Options = {
  completedMilestones: readonly NuxProgress.MilestoneKey[];
  eventName: NuxEventName;
  status: NuxAppState["status"];
};

/**
 * Whether this outcome is the publish that finishes the first-dashboard
 * tutorial. True only for a first `dashboard.published` during an in-progress
 * tutorial after the earlier milestones are already done.
 */
export function shouldCelebrateFirstDashboardCompletion(
  options: Readonly<Options>,
): boolean {
  return (
    options.status === "in_progress" &&
    options.eventName === "dashboard.published" &&
    !options.completedMilestones.includes("share_dashboard") &&
    nuxSelectors.areAllMilestonesComplete([
      ...options.completedMilestones,
      "share_dashboard",
    ])
  );
}
