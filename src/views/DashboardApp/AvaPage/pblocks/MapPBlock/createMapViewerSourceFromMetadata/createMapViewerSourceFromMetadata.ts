import { match, P } from "ts-pattern";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaPageMetadata } from "@/views/DashboardApp/AvaPage/useAvaPageMetadata";
import type { MapViewerSource } from "@/views/GisApp/MapViewer/MapViewer.types";

/**
 * Where a Map block draws from. A public page has no access to maps or
 * datasets, so it reads the published snapshot. Every workspace surface,
 * including a workspace-published dashboard, draws the map live.
 */
export function createMapViewerSourceFromMetadata(
  options: Readonly<{ metadata: AvaPageMetadata; mapId: AvaMap.Id }>,
): MapViewerSource {
  const { mapId } = options;
  return match(options.metadata)
    .with({ auth: "public" }, (metadata) => {
      return {
        type: "snapshot" as const,
        mapId,
        dashboardId: metadata.dashboardId,
        snapshotRevision: metadata.snapshotRevision,
      };
    })
    .with({ auth: P.union("workspace", "workspace_published") }, (metadata) => {
      return {
        type: "live" as const,
        mapId,
        workspaceId: metadata.workspaceId,
      };
    })
    .exhaustive();
}
