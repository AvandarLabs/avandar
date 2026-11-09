import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";

/** One published layer as the publish preview lists it. */
export type MapSnapshotLayerSummary = {
  layerId: MapLayer.Id;
  layerName: string;
  featureCount: number;
};

/** Each published layer's name and how many features it puts on the web. */
export function getMapSnapshotLayerSummaries(
  snapshot: Readonly<MapSnapshot>,
): MapSnapshotLayerSummary[] {
  return snapshot.layers.map((snapshotLayer) => {
    const layer = snapshot.config.layers.find((candidate) => {
      return candidate.id === snapshotLayer.layerId;
    });
    return {
      layerId: snapshotLayer.layerId,
      layerName: layer?.name ?? "",
      featureCount: snapshotLayer.featureCollection.features.length,
    };
  });
}
