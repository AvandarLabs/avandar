import { describe, expect, it, vi } from "vitest";
import { WEB_MERCATOR_MAX_LATITUDE } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.constants";
import { act, renderHook } from "@/test-utils";
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

const EMPTY_LAYER_BOUNDS: ReadonlyMap<MapLayer.Id, MapBounds | undefined> =
  new Map();

describe("useAutoFitNewLayers", () => {
  it("keeps the saved view when the map opens with existing layers", () => {
    const requestFitBounds = vi.fn();
    const { rerender } = _renderAutoFitNewLayers({
      layerBounds: new Map([
        [FIRST_LAYER_ID, undefined],
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

    expect(requestFitBounds).not.toHaveBeenCalled();
  });

  it("keeps the saved view when existing layers are ready on open", () => {
    const requestFitBounds = vi.fn();

    _renderAutoFitNewLayers({
      layerBounds: new Map([[FIRST_LAYER_ID, FIRST_BOUNDS]]),
      requestFitBounds,
    });

    expect(requestFitBounds).not.toHaveBeenCalled();
  });

  it("fits a layer added after the map opened", () => {
    const requestFitBounds = vi.fn();
    const { rerender } = _renderAutoFitNewLayers({
      layerBounds: new Map([[FIRST_LAYER_ID, FIRST_BOUNDS]]),
      requestFitBounds,
    });

    rerender({
      currentLayerBounds: new Map([
        [FIRST_LAYER_ID, FIRST_BOUNDS],
        [SECOND_LAYER_ID, undefined],
      ]),
    });
    rerender({
      currentLayerBounds: new Map([
        [FIRST_LAYER_ID, FIRST_BOUNDS],
        [SECOND_LAYER_ID, SECOND_BOUNDS],
      ]),
    });

    expect(requestFitBounds).toHaveBeenCalledTimes(1);
    expect(requestFitBounds).toHaveBeenCalledWith(SECOND_BOUNDS);
  });

  it("fits the first layer added to an empty map", () => {
    const requestFitBounds = vi.fn();
    const { rerender } = _renderAutoFitNewLayers({
      layerBounds: EMPTY_LAYER_BOUNDS,
      requestFitBounds,
    });

    rerender({
      currentLayerBounds: new Map([[FIRST_LAYER_ID, FIRST_BOUNDS]]),
    });

    expect(requestFitBounds).toHaveBeenCalledTimes(1);
    expect(requestFitBounds).toHaveBeenCalledWith(FIRST_BOUNDS);
  });

  it("requests one union bounds fit for simultaneously ready layers", () => {
    const requestFitBounds = vi.fn();
    const { rerender } = _renderAutoFitNewLayers({
      layerBounds: EMPTY_LAYER_BOUNDS,
      requestFitBounds,
    });

    rerender({
      currentLayerBounds: new Map([
        [FIRST_LAYER_ID, FIRST_BOUNDS],
        [SECOND_LAYER_ID, SECOND_BOUNDS],
      ]),
    });

    expect(requestFitBounds).toHaveBeenCalledTimes(1);
    expect(requestFitBounds).toHaveBeenCalledWith([
      [-74.02, 40.68],
      [-73.91, 40.81],
    ]);
  });

  it("does not refit an added layer when an identical map rerenders", () => {
    const requestFitBounds = vi.fn();
    const { rerender } = _renderAutoFitNewLayers({
      layerBounds: EMPTY_LAYER_BOUNDS,
      requestFitBounds,
    });

    rerender({ currentLayerBounds: new Map([[FIRST_LAYER_ID, FIRST_BOUNDS]]) });
    rerender({
      currentLayerBounds: new Map([
        [FIRST_LAYER_ID, [...FIRST_BOUNDS] as MapBounds],
      ]),
    });

    expect(requestFitBounds).toHaveBeenCalledTimes(1);
    expect(requestFitBounds).toHaveBeenLastCalledWith(FIRST_BOUNDS);
  });
});

describe("useFitBoundsRequest", () => {
  it("clamps latitude to the range a Web Mercator camera can show", () => {
    const insetsRef = { current: { top: 0, right: 0, bottom: 0, left: 0 } };
    const { result } = renderHook(() => {
      return FitBoundsRequest.useFitBoundsRequest(insetsRef);
    });

    act(() => {
      result.current.requestFitBounds([
        [-74, -90],
        [-73, 90],
      ]);
    });

    expect(result.current.fitBoundsRequest?.bounds).toEqual([
      [-74, -WEB_MERCATOR_MAX_LATITUDE],
      [-73, WEB_MERCATOR_MAX_LATITUDE],
    ]);
  });
});
