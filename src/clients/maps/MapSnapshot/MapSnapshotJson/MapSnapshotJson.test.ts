import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapSnapshotJson } from "@/clients/maps/MapSnapshot/MapSnapshotJson/MapSnapshotJson";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";

const SCHOOLS_LAYER = MapLayer.makeEmpty("Schools");

const SNAPSHOT: MapSnapshot = {
  version: 1,
  mapId: "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id,
  mapName: "Coverage risk",
  config: AvaMapConfig.withLayerAdded({
    config: AvaMapConfig.makeEmpty(),
    layer: SCHOOLS_LAYER,
  }),
  layers: [
    {
      layerId: SCHOOLS_LAYER.id,
      featureCollection: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: 0,
            geometry: { type: "Point", coordinates: [-73.98, 40.75] },
            properties: { school_name: "PS 11" },
          },
        ],
      },
      aggregation: undefined,
    },
  ],
};

describe("MapSnapshotJson", () => {
  it("reads back the features and layer names it wrote", () => {
    const restored = MapSnapshotJson.fromJson(MapSnapshotJson.toJson(SNAPSHOT));

    expect(restored.layers[0]?.featureCollection).toEqual(
      SNAPSHOT.layers[0]?.featureCollection,
    );
    expect(restored.config.layers.map(MapLayer.toPopupColumnNames)).toEqual([
      "all",
    ]);
    expect(restored.config.layers[0]?.name).toBe("Schools");
  });

  it("keeps a layer's point aggregation", () => {
    const aggregation = {
      cellsAcross: 64,
      aggregatedRowCount: 12_000,
      didCoarsenGrid: false,
    };
    const snapshot: MapSnapshot = {
      ...SNAPSHOT,
      layers: [{ ...SNAPSHOT.layers[0]!, aggregation }],
    };

    expect(
      MapSnapshotJson.fromJson(MapSnapshotJson.toJson(snapshot)).layers[0]
        ?.aggregation,
    ).toEqual(aggregation);
  });

  it("rejects a layer whose features are not a FeatureCollection", () => {
    const tampered = JSON.parse(MapSnapshotJson.toJson(SNAPSHOT));
    tampered.layers[0].featureCollection = { type: "Feature" };

    expect(() => {
      return MapSnapshotJson.fromJson(JSON.stringify(tampered));
    }).toThrow();
  });
});
