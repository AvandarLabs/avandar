import { expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@/test-utils";
import { LayerInspector } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

vi.mock("@/views/GisApp/shell/MapChromePanel/MapChromePanel", () => {
  return {
    MapChromePanel: ({ children }: { children: ReactNode }) => {
      return <section>{children}</section>;
    },
  };
});

vi.mock(
  "@/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorBody",
  () => {
    return {
      LayerInspectorBody: ({
        inspectorView,
      }: {
        inspectorView: { type: string };
      }) => {
        return <div>{inspectorView.type}</div>;
      },
    };
  },
);

const LAYER_ID = "00000000-0000-4000-8000-000000000001" as MapLayer.Id;
const FULLY_UNMATCHED_STATE = {
  spatialDiagnostics: {
    sourceCount: 4,
    matchedSourceKeyCount: 0,
  },
} as MapLayerViewState;

function _layer(geoBinding: MapLayer.GeoBinding | undefined): MapLayer.T {
  return { id: LAYER_ID, geoBinding } as MapLayer.T;
}

function _renderInspector(options: {
  layer: MapLayer.T;
  viewState?: MapLayerViewState;
  inspectorView?: { type: "sections" | "validationReport" };
  onInspectorViewChange?: (view: { type: string }) => void;
}) {
  return render(
    <LayerInspector
      layer={options.layer}
      viewState={options.viewState}
      inspectorView={options.inspectorView ?? { type: "sections" }}
      onInspectorViewChange={options.onInspectorViewChange ?? vi.fn()}
      isCollapsed={false}
      onToggleCollapsed={vi.fn()}
      onLayerChange={vi.fn()}
    />,
  );
}

it("does not interrupt a newly configured boundary join", async () => {
  const onInspectorViewChange = vi.fn();
  const { rerender } = _renderInspector({
    layer: _layer(undefined),
    onInspectorViewChange,
  });

  rerender(
    <LayerInspector
      layer={_layer({ type: "joinToBoundaries" } as MapLayer.GeoBinding)}
      viewState={FULLY_UNMATCHED_STATE}
      inspectorView={{ type: "sections" }}
      onInspectorViewChange={onInspectorViewChange}
      isCollapsed={false}
      onToggleCollapsed={vi.fn()}
      onLayerChange={vi.fn()}
    />,
  );

  await waitFor(() => {
    expect(onInspectorViewChange).not.toHaveBeenCalled();
  });
});

it("opens the report for a fully unmatched persisted boundary join", async () => {
  const onInspectorViewChange = vi.fn();
  _renderInspector({
    layer: _layer({ type: "joinToBoundaries" } as MapLayer.GeoBinding),
    viewState: FULLY_UNMATCHED_STATE,
    onInspectorViewChange,
  });

  await waitFor(() => {
    expect(onInspectorViewChange).toHaveBeenCalledWith({ type: "matchReport" });
  });
});

it("renders the coordinate validation view supplied by the app", () => {
  _renderInspector({
    layer: _layer({ type: "latLngColumns" } as MapLayer.GeoBinding),
    inspectorView: { type: "validationReport" },
  });

  expect(screen.getByText("validationReport")).toBeInTheDocument();
});
