import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test-utils";
import { FitBoundsRequest } from "./FitBoundsRequest";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type { RenderHookResult } from "@testing-library/react";

const FIRST_LAYER_ID = "layer-a" as MapLayer.Id;
const SECOND_LAYER_ID = "layer-b" as MapLayer.Id;
const FIRST_BOUNDS: MapBounds = [
  [-73.99, 40.7],
  [-73.95, 40.78],
];
const SECOND_BOUNDS: MapBounds = [
  [-74.02, 40.68],
  [-73.91, 40.81],
];

function _renderAutoFitNewLayers({
  layerBounds,
  requestFitBounds,
}: Readonly<{
  layerBounds: ReadonlyMap<MapLayer.Id, MapBounds | undefined>;
  requestFitBounds: (bounds: MapBounds) => void;
}>): RenderHookResult<
  void,
  { currentLayerBounds: ReadonlyMap<MapLayer.Id, MapBounds | undefined> }
> {
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

    _renderAutoFitNewLayers({
      layerBounds: new Map([
        [FIRST_LAYER_ID, FIRST_BOUNDS],
        [SECOND_LAYER_ID, SECOND_BOUNDS],
      ]),
      requestFitBounds,
    });

    expect(requestFitBounds).toHaveBeenCalledTimes(1);
    expect(requestFitBounds).toHaveBeenCalledWith([
      [-74.02, 40.68],
      [-73.91, 40.81],
    ]);
  });

  it("does not refit layers when an identical map rerenders", () => {
    const requestFitBounds = vi.fn();
    const { rerender } = _renderAutoFitNewLayers({
      layerBounds: new Map([[FIRST_LAYER_ID, FIRST_BOUNDS]]),
      requestFitBounds,
    });

    rerender({
      currentLayerBounds: new Map([
        [FIRST_LAYER_ID, [...FIRST_BOUNDS] as MapBounds],
      ]),
    });

    expect(requestFitBounds).toHaveBeenCalledTimes(1);
    expect(requestFitBounds).toHaveBeenLastCalledWith(FIRST_BOUNDS);
  });

  it("fits a layer when it becomes ready after another layer", () => {
    const requestFitBounds = vi.fn();
    const { rerender } = _renderAutoFitNewLayers({
      layerBounds: new Map([
        [FIRST_LAYER_ID, FIRST_BOUNDS],
        [SECOND_LAYER_ID, undefined],
      ]),
      requestFitBounds,
    });

    rerender({
      currentLayerBounds: new Map([
        [FIRST_LAYER_ID, FIRST_BOUNDS],
        [SECOND_LAYER_ID, SECOND_BOUNDS],
      ]),
    });

    expect(requestFitBounds).toHaveBeenCalledTimes(2);
    expect(requestFitBounds).toHaveBeenNthCalledWith(1, FIRST_BOUNDS);
    expect(requestFitBounds).toHaveBeenNthCalledWith(2, SECOND_BOUNDS);
  });
});
