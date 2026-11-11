import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Which camera a read-only map opens on: its saved view or a bookmark. */
export type MapViewerCamera =
  | { type: "saved" }
  | { type: "bookmark"; bookmarkId: AvaMapConfig.BookmarkId };

/**
 * Where a read-only map's features come from: the live map and its datasets,
 * or the snapshot a public dashboard published.
 */
export type MapViewerSource =
  | { type: "live"; mapId: AvaMap.Id; workspaceId: Workspace.Id }
  | {
      type: "snapshot";
      mapId: AvaMap.Id;
      dashboardId: Dashboard.Id;
      snapshotRevision: string;
    };

/** How a read-only map is framed on the page. */
export type MapViewerDisplay = {
  camera: MapViewerCamera;
  heightPx: number;
  showLegend: boolean;
  isInteractive: boolean;
};
