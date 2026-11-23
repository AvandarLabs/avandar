import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapViewerCamera } from "@/views/GisApp/MapViewer/MapViewer.types";

/**
 * The camera a read-only map opens on. A bookmark the author has since
 * deleted falls back to the map's saved view rather than to nowhere.
 */
export function mapViewerCameraToViewState(
  options: Readonly<{ camera: MapViewerCamera; config: AvaMapConfig.T }>,
): AvaMapConfig.ViewState {
  const { camera, config } = options;
  if (camera.type === "saved") {
    return config.view;
  }
  const bookmark = config.bookmarks.find((candidate) => {
    return candidate.id === camera.bookmarkId;
  });
  return bookmark?.view ?? config.view;
}
