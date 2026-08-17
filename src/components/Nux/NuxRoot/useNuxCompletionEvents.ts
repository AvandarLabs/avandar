import { propEq } from "@avandar/utils";
import { useEffect, useRef } from "react";
import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard/firstDashboard";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import type { NuxEvent } from "@/components/Nux/NuxEvents/NuxEvents";

/**
 * Advances the tutorial when a real outcome lands.
 *
 * The subscription exists only while the tutorial is mounted, which is what
 * makes `NuxEvents.emit` free for everyone else: with no subscriber, the
 * production call sites do nothing at all.
 */
export function useNuxCompletionEvents(): void {
  const workspace = useCurrentWorkspace();
  const state = NuxStateManager.useState();
  const dispatch = NuxStateManager.useDispatch();

  // The subscription is deliberately registered once per mount, so its listener
  // cannot read `state` directly without capturing the mount-render value. This
  // ref is how the listener sees the live status and completion set.
  const latestStateRef = useRef(state);
  useEffect(
    function trackLatestNuxState() {
      latestStateRef.current = state;
    },
    [state],
  );

  useEffect(
    function subscribeToNuxEvents() {
      return NuxEvents.subscribe((event: NuxEvent) => {
        // A dismissed tutorial listens to nothing. `completeMilestone` already
        // refuses to write a status back over `dismissed`, but returning here
        // also keeps the analytics funnel clean.
        if (latestStateRef.current.status === "dismissed") {
          return;
        }
        // Not a completion. `FIRST_DASHBOARD_MILESTONES.find` would return
        // `undefined` for it anyway, since no milestone declares it as a
        // completion event, but relying on that would be relying on an
        // accident.
        if (event.name === "dashboard.shareBlocked") {
          dispatch.setBlockedReason(event.payload.reason);
          return;
        }
        const milestone = FIRST_DASHBOARD_MILESTONES.find(
          propEq("completionEvent", event.name),
        );
        if (!milestone) {
          return;
        }
        // `completeMilestone` is idempotent, so a repeat delivery is harmless
        // to state but would still log a second completion. Anyone who has
        // finished the tutorial keeps saving datasets and creating dashboards
        // forever, so without this the event count is unusable for funnel
        // analysis.
        const isAlreadyComplete =
          latestStateRef.current.completedMilestones.includes(milestone.key);
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
        if (isAlreadyComplete) {
          return;
        }
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
