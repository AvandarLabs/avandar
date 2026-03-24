import type { AvaPageMetadata } from "../useAvaPageMetadata";
import type { Dashboard } from "$/models/Dashboard/Dashboard.types";

export function getAvaPageMetadataFromDashboard(
  dashboard: Dashboard,
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
