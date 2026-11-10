import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { createSnapshotLayerQueryStates } from "@/views/GisApp/MapViewer/createSnapshotLayerQueryStates/createSnapshotLayerQueryStates";
import type { AvaMap } from "$/models/AvaMap/AvaMap";

describe("createSnapshotLayerQueryStates", () => {
  it("hands each snapshot layer to the renderer as finished snapshot data", () => {
    const layer = MapLayer.makeEmpty("Schools");
    const featureCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };

    const states = createSnapshotLayerQueryStates({
      version: 1,
      mapId: "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id,
      mapName: "Coverage risk",
      config: AvaMapConfig.makeEmpty(),
      layers: [
        { layerId: layer.id, featureCollection, aggregation: undefined },
      ],
    });

    expect(states.get(layer.id)).toMatchObject({
      data: { type: "snapshot", featureCollection, aggregation: undefined },
      isLoading: false,
      error: undefined,
    });
  });
});
