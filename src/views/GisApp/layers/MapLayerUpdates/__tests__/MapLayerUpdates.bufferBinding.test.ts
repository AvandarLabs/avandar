import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it } from "vitest";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";

function _createBufferLayer(): MapLayer.T {
  return {
    ...MapLayer.createArea("Buffer of Cases"),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: uuid<MapLayer.Id>(),
      distanceMeters: MapLayer.defaultBufferDistanceMeters,
      dissolve: false,
    },
  };
}

describe("buffer-of-layer updates", () => {
  it.each([
    { distanceMeters: 50, expected: 100 },
    { distanceMeters: 2_000_000, expected: 1_000_000 },
  ])(
    "clamps $distanceMeters meter buffers to $expected",
    ({ distanceMeters, expected }) => {
      const layer = _createBufferLayer();

      const updatedLayer = MapLayerUpdates.withBufferDistanceMeters({
        layer,
        distanceMeters,
      });

      expect(updatedLayer.geoBinding).toMatchObject({
        type: "bufferOfLayer",
        distanceMeters: expected,
      });
    },
  );

  it("sets dissolve on a buffer layer", () => {
    const layer = _createBufferLayer();

    const updatedLayer = MapLayerUpdates.withBufferDissolve({
      layer,
      dissolve: true,
    });

    expect(updatedLayer.geoBinding).toMatchObject({
      type: "bufferOfLayer",
      dissolve: true,
    });
  });

  it("keeps a non-buffer layer unchanged", () => {
    const layer = MapLayer.makeEmpty("Cases");

    expect(
      MapLayerUpdates.withBufferDistanceMeters({
        layer,
        distanceMeters: 500,
      }),
    ).toBe(layer);
    expect(MapLayerUpdates.withBufferDissolve({ layer, dissolve: true })).toBe(
      layer,
    );
  });
});
