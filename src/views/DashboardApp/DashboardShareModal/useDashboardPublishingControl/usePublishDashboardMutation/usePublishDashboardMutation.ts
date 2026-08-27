import { useLingui } from "@lingui/react/macro";
import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { isShareableDashboardLimitError } from "@/utils/isShareableDashboardLimitError/isShareableDashboardLimitError";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { makeDashboardPublishAnalyticsEventFromDashboards } from "@/views/DashboardApp/DashboardShareModal/makeDashboardPublishAnalyticsEventFromDashboards/makeDashboardPublishAnalyticsEventFromDashboards";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

/**
 * The publish mutation plus everything the user hears about it: the toast, the
 * analytics event, and the two ways a publish can be refused.
 *
 * The caller owns the dashboard state, so a success is reported through
 * `onPublished` rather than written here.
 */
export function usePublishDashboardMutation(
  options: Readonly<{
    currentDashboard: Dashboard.T;
    onPublished: (updatedDashboard: Dashboard.T) => void;
    /**
     * Called when the database, not the UI gate, is what refused the publish.
     * The caller owns the upgrade modal, so the hook reports the refusal
     * rather than rendering anything itself.
     */
    onShareableLimitReached: () => void;
  }>,
): ReturnType<typeof DashboardClient.usePublishDashboard> {
  const { t } = useLingui();
  const { currentDashboard, onPublished, onShareableLimitReached } = options;

  return DashboardClient.usePublishDashboard({
    onSuccess: (updatedDashboard) => {
      notifySuccess(
        currentDashboard.visibility === "draft"
          ? t`Dashboard published!`
          : t`Dashboard share settings updated.`,
      );
      void AnalyticsClient.logEvent({
        ...makeDashboardPublishAnalyticsEventFromDashboards({
          previousDashboard: currentDashboard,
          updatedDashboard,
        }),
        workspaceId: updatedDashboard.workspaceId,
        app: "dashboards",
      });
      if (currentDashboard.visibility === "draft") {
        NuxEvents.emit("dashboard.published", {
          dashboardId: updatedDashboard.id,
        });
      }
      onPublished(updatedDashboard);
    },
    onError: (error: Error) => {
      console.error(error);
      // The UI gate in `DashboardShareModal` is deliberately optimistic while
      // its permission query is in flight, and the answer it caches counts the
      // whole workspace while the exemption is per dashboard, so a publish
      // elsewhere in the workspace can leave the gate stale. In that window the
      // database trigger is the only thing that stops the publish, and the
      // generic toast would tell the user to "try again" at something that can
      // never succeed on this plan.
      //
      // The upgrade modal rather than a toast, because it is the SAME surface
      // the gate offers when it does manage to answer in time. The two paths
      // are the same refusal found at different moments, and answering them
      // differently would make an upgrade reachable or not depending on how
      // fast a query returned. The modal also names the plan and its limit,
      // which a toast cannot do without restating that copy a third time.
      if (isShareableDashboardLimitError(error)) {
        onShareableLimitReached();
        return;
      }
      notifyError({
        title: t`Could not publish dashboard`,
        message: t`Please try again. Your dashboard has not been published.`,
      });
    },
  });
}
