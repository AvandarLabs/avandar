import { matchLiteral } from "@avandar/utils";
import { FIRST_DASHBOARD_PREREQUISITES } from "@/components/Nux/NuxPrerequisites/firstDashboard/firstDashboardPrerequisites/firstDashboardPrerequisites";
import { NuxPrerequisiteJudge } from "@/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge/NuxPrerequisiteJudge";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import type { NuxEvent } from "@/components/Nux/NuxEvents/NuxEvents";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { Workspace } from "$/models/Workspace/Workspace";

type Options = {
  dispatch: ReturnType<typeof NuxStateManager.useDispatch>;
  event: NuxEvent;
  latestState: NuxAppState;
  shareBlockedReason: string;
  workspaceId: Workspace.Id;
};

function _completePrerequisiteFromEvent(
  options: Options & {
    prerequisite: (typeof FIRST_DASHBOARD_PREREQUISITES)[number];
  },
): void {
  const isAlreadyComplete = options.latestState.completedMilestones.includes(
    options.prerequisite.milestoneKey,
  );
  options.dispatch.completeMilestone({
    key: options.prerequisite.milestoneKey,
    datasetId:
      options.event.name === "dataset.saved" ?
        options.event.payload.datasetId
      : undefined,
    dashboardId:
      (
        options.event.name === "dashboard.created" ||
        options.event.name === "dashboard.published"
      ) ?
        options.event.payload.dashboardId
      : undefined,
  });
  if (isAlreadyComplete) {
    return;
  }
  void AnalyticsClient.logEvent({
    event: "nux.milestone_completed",
    workspaceId: options.workspaceId,
    payload: { milestoneKey: options.prerequisite.milestoneKey },
  });
}

/** Applies one live NUX event to tutorial state and analytics. */
export function onNuxCompletionEvent(options: Options): void {
  if (options.latestState.status === "dismissed") {
    return;
  }
  if (options.event.name === "dashboard.shareBlocked") {
    options.dispatch.setBlockedReason(
      matchLiteral(options.event.payload.reason, {
        shareable_dashboard_limit: options.shareBlockedReason,
      }),
    );
    return;
  }
  if (options.event.name === "dashboard.deleted") {
    options.dispatch.forgetRecentDashboardIfMatches(
      options.event.payload.dashboardId,
    );
    return;
  }
  if (options.event.name === "dataset.summaryOpened") {
    options.dispatch.closeGatedPayoffOnEvent(options.event.name);
    return;
  }
  const prerequisite = FIRST_DASHBOARD_PREREQUISITES.find((candidate) => {
    return NuxPrerequisiteJudge.matchesLiveEvent(options.event, candidate);
  });
  if (!prerequisite) {
    return;
  }
  _completePrerequisiteFromEvent({ ...options, prerequisite });
}
