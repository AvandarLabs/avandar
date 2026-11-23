import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { getMapSnapshotLayerSummaries } from "@/clients/maps/MapSnapshot/getMapSnapshotLayerSummaries/getMapSnapshotLayerSummaries";
import type { AvaMap } from "$/models/AvaMap/AvaMap";

describe("getMapSnapshotLayerSummaries", () => {
  it("counts each published layer's features under its name", () => {
    const layer = MapLayer.makeEmpty("Schools");
    const point: GeoJSON.Feature = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0] },
      properties: {},
    };

    expect(
      getMapSnapshotLayerSummaries({
        version: 1,
        mapId: "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id,
        mapName: "Coverage risk",
        config: AvaMapConfig.withLayerAdded({
          config: AvaMapConfig.makeEmpty(),
          layer,
        }),
        layers: [
          {
            layerId: layer.id,
            featureCollection: {
              type: "FeatureCollection",
              features: [point, point],
            },
            aggregation: undefined,
          },
        ],
      }),
    ).toEqual([{ layerId: layer.id, layerName: "Schools", featureCount: 2 }]);
  });
});
