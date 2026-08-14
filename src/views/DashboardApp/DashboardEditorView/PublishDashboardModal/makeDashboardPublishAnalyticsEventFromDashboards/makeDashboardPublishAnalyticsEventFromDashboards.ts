import type { AvaPageGenericData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { ClientAnalyticsEvent } from "$/analytics/analyticsEvents/analyticsEvents";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

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
  if (options.previousSlug === options.updatedSlug) {
    return "unchanged";
  }
  return options.updatedSlug === undefined ? "clear" : "set";
}

/** Classifies analytics for a successful dashboard publishing mutation. */
export function makeDashboardPublishAnalyticsEventFromDashboards(options: {
  previousDashboard: Dashboard.T;
  updatedDashboard: Dashboard.T;
}): DashboardPublishAnalyticsEvent {
  const { previousDashboard, updatedDashboard } = options;
  if (previousDashboard.isPublic) {
    return {
      event: "dashboard.share_settings_updated",
      payload: {
        dashboardId: updatedDashboard.id,
        slugAction: _getSlugAction({
          previousSlug: previousDashboard.slug,
          updatedSlug: updatedDashboard.slug,
        }),
      },
    };
  }

  // Dashboard config is generated as JSON, while the editor guarantees the
  // Ava Page shape before the publishing modal can be opened.
  const config = updatedDashboard.config as AvaPageGenericData;
  return {
    event: "dashboard.published",
    payload: {
      dashboardId: updatedDashboard.id,
      blockCount: config.content.length,
      hasVanitySlug: Boolean(updatedDashboard.slug),
    },
  };
}
