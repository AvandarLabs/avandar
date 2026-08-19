import type { LayerStats } from "@/views/GisApp/layers/getLayerStatsFromFeatureCollection/getLayerStatsFromFeatureCollection";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Inputs shared by MapLibre paint-layer builders. */
export type CreateMapLayerSpecInput = {
  layer: MapLayer.T;
  stats: LayerStats;
  valueColumnName: string | undefined;
  sourceId: string;
};
