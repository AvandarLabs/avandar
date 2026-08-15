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
}) {
  return render(
    <LayerInspector
      layer={options.layer}
      viewState={options.viewState}
      isCollapsed={false}
      onToggleCollapsed={vi.fn()}
      onLayerChange={vi.fn()}
    />,
  );
}

it("does not interrupt a newly configured boundary join", async () => {
  const { rerender } = _renderInspector({ layer: _layer(undefined) });

  rerender(
    <LayerInspector
      layer={_layer({ type: "joinToBoundaries" } as MapLayer.GeoBinding)}
      viewState={FULLY_UNMATCHED_STATE}
      isCollapsed={false}
      onToggleCollapsed={vi.fn()}
      onLayerChange={vi.fn()}
    />,
  );

  await waitFor(() => {
    expect(screen.getByText("sections")).toBeInTheDocument();
  });
});

it("opens the report for a fully unmatched persisted boundary join", async () => {
  _renderInspector({
    layer: _layer({ type: "joinToBoundaries" } as MapLayer.GeoBinding),
    viewState: FULLY_UNMATCHED_STATE,
  });

  await waitFor(() => {
    expect(screen.getByText("matchReport")).toBeInTheDocument();
  });
});
