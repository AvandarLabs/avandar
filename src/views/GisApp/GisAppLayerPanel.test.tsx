import { describe, expect, it, vi } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen } from "@/test-utils";
import { GisAppLayerPanel } from "@/views/GisApp/GisAppLayerPanel";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { GisAppLayerActions } from "@/views/GisApp/useGisAppLayerActions";
import type { RenderResult } from "@testing-library/react";

vi.mock(
  "@/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorBody",
  () => {
    return {
      LayerInspectorBody: () => {
        return <div>Layer settings body</div>;
      },
    };
  },
);

const VIEW_STATE: MapLayerViewState = {
  status: "ready",
  error: undefined,
  featureCount: 1,
  droppedRowCount: 0,
  drops: [],
  largestDropReason: undefined,
  filterCount: 0,
  onRetry: vi.fn(),
};

function _actions(): GisAppLayerActions {
  return {
    onAddLayerFromSource: vi.fn(),
    onDeleteLayer: vi.fn(),
    onDuplicateLayer: vi.fn(),
    onOpenFeatureList: vi.fn(),
    onRenameLayer: vi.fn(),
    onStackOrderChange: vi.fn(),
    onToggleLayerVisible: vi.fn(),
    onZoomToLayer: vi.fn(),
    updateSelectedLayer: vi.fn(),
  };
}

function _app(
  layer: MapLayer.T,
  page: "list" | "settings",
): GisAppState & {
  openLayerSettings: ReturnType<typeof vi.fn>;
  closeLayerSettings: ReturnType<typeof vi.fn>;
} {
  const openLayerSettings = vi.fn();
  const closeLayerSettings = vi.fn();
  const config = AvaMapConfig.withLayerAdded({
    config: AvaMapConfig.makeEmpty(),
    layer,
  });
  return {
    rows: config.layers,
    layerViewStates: new Map([[layer.id, VIEW_STATE]]),
    selectedLayerId: layer.id,
    selectedLayer: layer,
    mapConfig: config,
    isAnnotationRowSelected: false,
    panelState: { layers: false, inspector: false, legend: false },
    layerPanelPage: page,
    inspectorView: { type: "sections" },
    openLayerSettings,
    closeLayerSettings,
    togglePanel: vi.fn(),
    setIsAnnotationRowSelected: vi.fn(),
    setSelectedAnnotationFeatureId: vi.fn(),
    setSelectedLayerId: vi.fn(),
    updateConfig: vi.fn(),
    onInspectorViewChange: vi.fn(),
  } as unknown as GisAppState & {
    openLayerSettings: ReturnType<typeof vi.fn>;
    closeLayerSettings: ReturnType<typeof vi.fn>;
  };
}

function _renderPanel(
  app: GisAppState,
  actions: GisAppLayerActions = _actions(),
): RenderResult {
  return render(<GisAppLayerPanel app={app} actions={actions} />);
}

describe("GisAppLayerPanel", () => {
  it("opens a layer's settings from its name and leaves hiding on the list", () => {
    const layer = MapLayer.makeEmpty("Schools");
    const app = _app(layer, "list");
    const actions = _actions();
    _renderPanel(app, actions);

    fireEvent.click(screen.getByRole("button", { name: "Schools 1 point" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Hide the layer Schools" }),
    );

    expect(app.setSelectedLayerId).toHaveBeenCalledWith(layer.id);
    expect(app.openLayerSettings).toHaveBeenCalledOnce();
    expect(actions.onToggleLayerVisible).toHaveBeenCalledOnce();
    expect(app.openLayerSettings).toHaveBeenCalledOnce();
  });

  it("keeps the layer list visible while that layer's controls are open", () => {
    const layer = MapLayer.makeEmpty("Schools");
    const app = _app(layer, "settings");
    _renderPanel(app);

    expect(screen.getByRole("heading", { name: "Layers" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Schools" })).toBeInTheDocument();
    expect(screen.getByText("Layer settings body")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add layer" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Schools/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hide the layer Schools" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "More actions for the layer Schools",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to layers" }));

    expect(app.closeLayerSettings).toHaveBeenCalledOnce();
    expect(app.setSelectedLayerId).not.toHaveBeenCalled();
  });

  it("returns to the layer's sections before the list", () => {
    const layer = MapLayer.makeEmpty("Schools");
    const app = _app(layer, "settings");
    app.inspectorView = { type: "matchReport" };
    _renderPanel(app);

    fireEvent.click(
      screen.getByRole("button", { name: "Back to layer settings" }),
    );

    expect(app.onInspectorViewChange).toHaveBeenCalledWith({
      type: "sections",
    });
    expect(app.closeLayerSettings).not.toHaveBeenCalled();
  });
});
