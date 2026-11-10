import { noop } from "@avandar/utils";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";

/**
 * Presents a snapshot's layers to the layer renderer as finished queries, so
 * a public map is drawn by the same code as a live one, with no DuckDB.
 */
export function createSnapshotLayerQueryStates(
  snapshot: Readonly<MapSnapshot>,
): Map<MapLayer.Id, MapLayerQueryState> {
  return new Map(
    snapshot.layers.map((snapshotLayer) => {
      return [
        snapshotLayer.layerId,
        {
          data: {
            type: "snapshot",
            featureCollection: snapshotLayer.featureCollection,
            aggregation: snapshotLayer.aggregation,
          },
          isLoading: false,
          isRefreshing: false,
          error: undefined,
          refetch: noop,
        },
      ];
    }),
  );
}
