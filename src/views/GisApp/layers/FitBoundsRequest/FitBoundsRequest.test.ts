import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test-utils";
import { FitBoundsRequest } from "./FitBoundsRequest";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

const firstLayerId = "layer-a" as MapLayer.Id;
const secondLayerId = "layer-b" as MapLayer.Id;
const firstBounds: MapBounds = [
  [-73.99, 40.7],
  [-73.95, 40.78],
];
const secondBounds: MapBounds = [
  [-74.02, 40.68],
  [-73.91, 40.81],
];

function _renderAutoFitNewLayers(
  layerBounds: ReadonlyMap<MapLayer.Id, MapBounds | undefined>,
  requestFitBounds: (bounds: MapBounds) => void,
) {
  return renderHook(
    ({ currentLayerBounds }: { currentLayerBounds: typeof layerBounds }) => {
      FitBoundsRequest.useAutoFitNewLayers({
        layerBounds: currentLayerBounds,
        requestFitBounds,
      });
    },
    { initialProps: { currentLayerBounds: layerBounds } },
  );
}

describe("useAutoFitNewLayers", () => {
  it("requests one union bounds fit for simultaneously ready layers", () => {
    const requestFitBounds = vi.fn();

    _renderAutoFitNewLayers(
      new Map([
        [firstLayerId, firstBounds],
        [secondLayerId, secondBounds],
      ]),
      requestFitBounds,
    );

    expect(requestFitBounds).toHaveBeenCalledTimes(1);
    expect(requestFitBounds).toHaveBeenCalledWith([
      [-74.02, 40.68],
      [-73.91, 40.81],
    ]);
  });

  it("does not refit layers when an identical map rerenders", () => {
    const requestFitBounds = vi.fn();
    const { rerender } = _renderAutoFitNewLayers(
      new Map([[firstLayerId, firstBounds]]),
      requestFitBounds,
    );

    rerender({
      currentLayerBounds: new Map([
        [firstLayerId, [...firstBounds] as MapBounds],
      ]),
    });

    expect(requestFitBounds).toHaveBeenCalledTimes(1);
    expect(requestFitBounds).toHaveBeenLastCalledWith(firstBounds);
  });

  it("fits a layer when it becomes ready after another layer", () => {
    const requestFitBounds = vi.fn();
    const { rerender } = _renderAutoFitNewLayers(
      new Map([
        [firstLayerId, firstBounds],
        [secondLayerId, undefined],
      ]),
      requestFitBounds,
    );

    rerender({
      currentLayerBounds: new Map([
        [firstLayerId, firstBounds],
        [secondLayerId, secondBounds],
      ]),
    });

    expect(requestFitBounds).toHaveBeenCalledTimes(2);
    expect(requestFitBounds).toHaveBeenNthCalledWith(1, firstBounds);
    expect(requestFitBounds).toHaveBeenNthCalledWith(2, secondBounds);
  });
});
