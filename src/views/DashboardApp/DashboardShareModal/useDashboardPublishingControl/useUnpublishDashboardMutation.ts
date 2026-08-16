import { useLingui } from "@lingui/react/macro";
import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

/**
 * The unpublish mutation plus its toast and analytics event.
 *
 * The caller owns the dashboard state, so a success is reported through
 * `onUnpublished` rather than written here.
 *
 * TODO(jpsyx): AVA-314. This hook exists mostly to hold a `useLingui` call so
 * the toast text can be translated. Once `useMutation` takes `successText`,
 * `errorText` and an analytics payload, the calling component can pass
 * translated strings directly and this wrapper goes away.
 */
export function useUnpublishDashboardMutation(
  options: Readonly<{
    currentDashboard: Dashboard.T;
    onUnpublished: (updatedDashboard: Dashboard.T) => void;
  }>,
): ReturnType<typeof DashboardClient.useUnpublishDashboard> {
  const { t } = useLingui();
  const { currentDashboard, onUnpublished } = options;

  return DashboardClient.useUnpublishDashboard({
    onSuccess: (updatedDashboard) => {
      notifySuccess(t`Dashboard unpublished.`);
      void AnalyticsClient.logEvent({
        event: "dashboard.unpublished",
        payload: {
          dashboardId: updatedDashboard.id,
          priorVisibility: currentDashboard.visibility,
        },
        workspaceId: updatedDashboard.workspaceId,
        app: "dashboards",
      });
      onUnpublished(updatedDashboard);
    },
    onError: (error: Error) => {
      console.error(error);
      notifyError({
        title: t`Could not unpublish dashboard`,
        message: t`Please try again. Your dashboard is still published.`,
      });
    },
  });
}
