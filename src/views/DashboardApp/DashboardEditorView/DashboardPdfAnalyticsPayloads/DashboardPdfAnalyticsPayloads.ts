import { getBlockCountFromDashboard } from "@/views/DashboardApp/AvaPage/utils/getBlockCountFromDashboard";
import type { AnalyticsEventPayloads } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

/** Privacy-safe payload builders for dashboard PDF export analytics. */
export const DashboardPdfAnalyticsPayloads = {
  /**
   * Builds the `dashboard.pdf_export_opened` payload recorded when the user
   * opens the export modal.
   */
  fromExportOpened: (
    dashboard: Dashboard.T,
  ): AnalyticsEventPayloads["dashboard.pdf_export_opened"] => {
    return {
      dashboardId: dashboard.id,
      blockCount: getBlockCountFromDashboard(dashboard),
    };
  },

  /**
   * Builds the `dashboard.pdf_exported` payload for an export that finished,
   * recording how long it took and which of the two export paths produced it.
   */
  fromExported: (
    options: Readonly<{
      dashboard: Dashboard.T;
      durationMs: number;
      mode: AnalyticsEventPayloads["dashboard.pdf_exported"]["mode"];
    }>,
  ): AnalyticsEventPayloads["dashboard.pdf_exported"] => {
    return {
      dashboardId: options.dashboard.id,
      blockCount: getBlockCountFromDashboard(options.dashboard),
      durationMs: Math.round(options.durationMs),
      mode: options.mode,
    };
  },
};
