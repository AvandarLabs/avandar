import type { AvaPageMetadata } from "@/views/DashboardApp/AvaPage/useAvaPageMetadata";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

export function getAvaPageMetadataFromDashboard(
  dashboard: Dashboard.T,
): AvaPageMetadata {
  if (dashboard.isPublic) {
    return {
      auth: "public",
      workspaceId: undefined,
      dashboardId: dashboard.id,
    };
  }
  return {
    auth: "workspace",
    workspaceId: dashboard.workspaceId,
    dashboardId: dashboard.id,
  };
}
