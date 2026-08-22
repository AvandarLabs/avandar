import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerStats } from "@/views/GisApp/layers/getLayerStatsFromFeatureCollection/getLayerStatsFromFeatureCollection";
import type { ClusterCountSource } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeClusterLayerSpecsFromMapLayer";

/** Inputs shared by MapLibre paint-layer builders. */
export type CreateMapLayerSpecInput = {
  layer: MapLayer.T;
  stats: LayerStats;
  valueColumnName: string | undefined;
  sourceId: string;

  /** Whether counts come from MapLibre's clustering or from the source rows. */
  countSource: ClusterCountSource;
};
