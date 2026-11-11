import { describe, expect, it, vi } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { renderHook } from "@/test-utils";
import { useGisAppLayerDeletion } from "@/views/GisApp/useGisAppLayerActions";
import type { GisAppLayerDeletionState } from "@/views/GisApp/useGisAppLayerActions";

function _makeDeletionState(
  featureListLayerId: MapLayer.Id | undefined,
): GisAppLayerDeletionState & { layer: MapLayer.T } {
  const layer = MapLayer.makeEmpty("Schools");
  return {
    layer,
    mapConfig: AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer,
    }),
    updateConfig: vi.fn(),
    selectedLayerId: undefined,
    setSelectedLayerId: vi.fn(),
    closeInspector: vi.fn(),
    closeLayerSettings: vi.fn(),
    featureListLayerId: featureListLayerId,
    closeFeatureList: vi.fn(),
  };
}

describe("useGisAppLayerDeletion", () => {
  it("closes the feature list when its layer is deleted", () => {
    const state = _makeDeletionState(undefined);
    const stateWithListOpen = { ...state, featureListLayerId: state.layer.id };
    const { result } = renderHook(() => {
      return useGisAppLayerDeletion(stateWithListOpen);
    });

    result.current(state.layer.id);

    expect(stateWithListOpen.closeFeatureList).toHaveBeenCalledOnce();
  });

  it("keeps another layer's feature list open", () => {
    const otherLayer = MapLayer.makeEmpty("Sites");
    const state = _makeDeletionState(otherLayer.id);
    const { result } = renderHook(() => {
      return useGisAppLayerDeletion(state);
    });

    result.current(state.layer.id);

    expect(state.closeFeatureList).not.toHaveBeenCalled();
    expect(state.closeLayerSettings).not.toHaveBeenCalled();
  });

  it("returns to the layer list when the selected layer is deleted", () => {
    const state = _makeDeletionState(undefined);
    state.selectedLayerId = state.layer.id;
    const { result } = renderHook(() => {
      return useGisAppLayerDeletion(state);
    });

    result.current(state.layer.id);

    expect(state.closeLayerSettings).toHaveBeenCalledOnce();
    expect(state.setSelectedLayerId).toHaveBeenCalledOnce();
  });
});
