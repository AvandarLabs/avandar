import type { ClientAnalyticsEvent } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { AvaPageGenericData } from "@/views/DashboardApp/AvaPage/AvaPage.types";

type DashboardPublishAnalyticsEvent = Extract<
  ClientAnalyticsEvent,
  {
    event: "dashboard.published" | "dashboard.share_settings_updated";
  }
>;

function _getSlugAction(options: {
  previousSlug: string | undefined;
  updatedSlug: string | undefined;
}): "set" | "clear" | "unchanged" {
  return options.previousSlug === options.updatedSlug
    ? "unchanged"
    : options.updatedSlug === undefined
      ? "clear"
      : "set";
}

/** Classifies analytics for a successful dashboard publishing mutation. */
export function makeDashboardPublishAnalyticsEventFromDashboards(
  options: Readonly<{
    previousDashboard: Dashboard.T;
    updatedDashboard: Dashboard.T;
  }>,
): DashboardPublishAnalyticsEvent {
  const { previousDashboard, updatedDashboard } = options;
  // `isPublic` is a generated column that is false for a workspace-published
  // dashboard, so branching on it would report every internal republish as a
  // first publish. The question this branch asks is "was it published at all".
  return previousDashboard.visibility !== "draft"
    ? {
        event: "dashboard.share_settings_updated",
        payload: {
          dashboardId: updatedDashboard.id,
          slugAction: _getSlugAction({
            previousSlug: previousDashboard.slug,
            updatedSlug: updatedDashboard.slug,
          }),
          visibility: updatedDashboard.visibility,
        },
      }
    : (() => {
        // Dashboard config is generated as JSON, while the editor guarantees
        // the Ava Page shape before the publishing modal can be opened.
        const config = updatedDashboard.config as AvaPageGenericData;
        return {
          event: "dashboard.published",
          payload: {
            dashboardId: updatedDashboard.id,
            blockCount: config.content.length,
            hasVanitySlug: Boolean(updatedDashboard.slug),
            visibility: updatedDashboard.visibility,
          },
        };
      })();
}
