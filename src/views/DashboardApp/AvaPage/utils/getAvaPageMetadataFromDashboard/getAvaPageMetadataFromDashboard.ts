import { assertIsDefined } from "@avandar/utils";
import { match, P } from "ts-pattern";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { AvaPageMetadata } from "@/views/DashboardApp/AvaPage/useAvaPageMetadata";

/** Where a dashboard page is rendered. */
export type AvaPageSurface = "editor" | "preview" | "published";

type DashboardMetadataSource = Pick<
  Dashboard.T,
  "id" | "snapshotRevision" | "updatedAt" | "visibility" | "workspaceId"
>;

function _getSnapshotRevision(
  dashboard: Readonly<DashboardMetadataSource>,
): string {
  assertIsDefined(dashboard.snapshotRevision, { name: "snapshotRevision" });
  return dashboard.snapshotRevision;
}

/**
 * Gets the dashboard data source for a rendering surface.
 *
 * The editor reads live workspace data. Previews and published routes read a
 * snapshot when one exists, while draft previews continue to read live data.
 */
export function getAvaPageMetadataFromDashboard(
  options: Readonly<{
    dashboard: DashboardMetadataSource;
    surface: AvaPageSurface;
  }>,
): AvaPageMetadata {
  const { dashboard, surface } = options;
  return match(surface)
    .with("editor", () => {
      return {
        auth: "workspace" as const,
        workspaceId: dashboard.workspaceId,
        dashboardId: dashboard.id,
      };
    })
    .with(P.union("preview", "published"), () => {
      return match(dashboard.visibility)
        .with("draft", () => {
          return {
            auth: "workspace" as const,
            workspaceId: dashboard.workspaceId,
            dashboardId: dashboard.id,
          };
        })
        .with("public", () => {
          return {
            auth: "public" as const,
            workspaceId: undefined,
            dashboardId: dashboard.id,
            snapshotRevision: _getSnapshotRevision(dashboard),
          };
        })
        .with("workspace", () => {
          return {
            auth: "workspace_published" as const,
            workspaceId: dashboard.workspaceId,
            dashboardId: dashboard.id,
            snapshotRevision: _getSnapshotRevision(dashboard),
          };
        })
        .exhaustive();
    })
    .exhaustive();
}
