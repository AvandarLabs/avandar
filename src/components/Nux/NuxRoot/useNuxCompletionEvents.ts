import { useEffect } from "react";
import { NuxEvents } from "@/components/Nux/nuxEvents";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import type { NuxEvent } from "@/components/Nux/nuxEvents";

/**
 * Advances the tutorial when a real outcome lands.
 *
 * The subscription exists only while the tutorial is mounted, which is what
 * makes `NuxEvents.emit` free for everyone else: with no subscriber, the four
 * production call sites do nothing at all.
 */
export function useNuxCompletionEvents(): void {
  const workspace = useCurrentWorkspace();
  const dispatch = NuxStateManager.useDispatch();

  useEffect(
    function subscribeToNuxEvents() {
      return NuxEvents.subscribe((event: NuxEvent) => {
        // Not a completion. `FIRST_DASHBOARD_MILESTONES.find` would return
        // `undefined` for it anyway, since no milestone declares it as a
        // completion event, but relying on that would be relying on an
        // accident.
        if (event.name === "dashboard.shareBlocked") {
          dispatch.setBlockedReason(event.payload.reason);
          return;
        }
        const milestone = FIRST_DASHBOARD_MILESTONES.find((candidate) => {
          return candidate.completionEvent === event.name;
        });
        if (!milestone) {
          return;
        }
        dispatch.completeMilestone({
          key: milestone.key,
          datasetId:
            event.name === "dataset.saved" ?
              event.payload.datasetId
            : undefined,
          dashboardId:
            event.name === "dashboard.created" ?
              event.payload.dashboardId
            : undefined,
        });
        void AnalyticsClient.logEvent({
          event: "nux.milestone_completed",
          workspaceId: workspace.id,
          payload: { milestoneKey: milestone.key },
        });
      });
    },
    [dispatch, workspace.id],
  );
}
