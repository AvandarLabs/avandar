import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapOverlay } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";

/**
 * The map-level overlay every layer query reads. The live map and the
 * publish-time compiler both build it here, so a public snapshot is filtered
 * by exactly what the author sees.
 */
export function createMapOverlayFromMapConfig(
  config: Readonly<AvaMapConfig.T>,
): MapOverlay {
  return { aoi: config.aoi, timeRange: config.timeRange };
}
