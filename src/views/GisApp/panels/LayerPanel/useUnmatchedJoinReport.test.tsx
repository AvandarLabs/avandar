import { describe, expect, it, vi } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { renderHook, waitFor } from "@/test-utils";
import { useUnmatchedJoinReport } from "@/views/GisApp/panels/LayerPanel/useUnmatchedJoinReport";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";

const LAYER_ID = "00000000-0000-4000-8000-000000000001" as MapLayer.Id;
const FULLY_UNMATCHED_STATE = {
  spatialDiagnostics: {
    sourceCount: 4,
    matchedSourceKeyCount: 0,
  },
} as MapLayerViewState;

function _layer(geoBinding: MapLayer.GeoBinding | undefined): MapLayer.T {
  return { ...MapLayer.makeEmpty("Layer"), id: LAYER_ID, geoBinding };
}

describe("useUnmatchedJoinReport", () => {
  it("does not interrupt a newly configured boundary join", async () => {
    const onOpenMatchReport = vi.fn();
    const { rerender } = renderHook(
      (props: {
        layer: MapLayer.T;
        viewState: MapLayerViewState | undefined;
      }) => {
        return useUnmatchedJoinReport({ ...props, onOpenMatchReport });
      },
      {
        initialProps: {
          layer: _layer(undefined),
          viewState: undefined as MapLayerViewState | undefined,
        },
      },
    );

    rerender({
      layer: _layer({ type: "joinToBoundaries" } as MapLayer.GeoBinding),
      viewState: FULLY_UNMATCHED_STATE,
    });

    await waitFor(() => {
      expect(onOpenMatchReport).not.toHaveBeenCalled();
    });
  });

  it("opens the report for a fully unmatched persisted boundary join", async () => {
    const onOpenMatchReport = vi.fn();
    renderHook(() => {
      return useUnmatchedJoinReport({
        layer: _layer({ type: "joinToBoundaries" } as MapLayer.GeoBinding),
        viewState: FULLY_UNMATCHED_STATE,
        onOpenMatchReport,
      });
    });

    await waitFor(() => {
      expect(onOpenMatchReport).toHaveBeenCalledOnce();
    });
  });
});
