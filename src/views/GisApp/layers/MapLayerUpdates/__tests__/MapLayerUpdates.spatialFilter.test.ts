import { describe, expect, it } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";

describe("spatial filter updates", () => {
  it("filters a layer by the given area layer", () => {
    const buffer = MapLayer.createArea("Buffer of Sites");

    const updated = MapLayerUpdates.withSpatialFilter({
      layer: MapLayer.makeEmpty("Schools"),
      spatialFilterLayerId: buffer.id,
    });

    expect(updated.spatialFilter).toEqual({ layerId: buffer.id });
  });

  it("clears the spatial filter", () => {
    const buffer = MapLayer.createArea("Buffer of Sites");
    const layer = {
      ...MapLayer.makeEmpty("Schools"),
      spatialFilter: { layerId: buffer.id },
    };

    expect(
      MapLayerUpdates.withSpatialFilter({
        layer,
        spatialFilterLayerId: undefined,
      }).spatialFilter,
    ).toBeUndefined();
  });

  it("returns the same layer when the filter is unchanged", () => {
    const layer = MapLayer.makeEmpty("Schools");

    expect(
      MapLayerUpdates.withSpatialFilter({
        layer,
        spatialFilterLayerId: undefined,
      }),
    ).toBe(layer);
  });
});
