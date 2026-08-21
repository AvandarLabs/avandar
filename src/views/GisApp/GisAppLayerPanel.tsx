import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { LayerPanel } from "@/views/GisApp/panels/LayerPanel/LayerPanel";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { GisAppLayerActions } from "@/views/GisApp/useGisAppLayerActions";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { app: GisAppState; actions: GisAppLayerActions };

function _selectDataLayer(app: GisAppState, layerId: MapLayer.Id): void {
  app.setIsAnnotationRowSelected(false);
  app.setSelectedAnnotationFeatureId(undefined);
  app.setSelectedLayerId(layerId);
}

function _toggleAnnotationsVisible(app: GisAppState): void {
  app.updateConfig((current) => {
    return {
      ...current,
      annotations: {
        ...current.annotations,
        isVisible: !current.annotations.isVisible,
      },
    };
  });
}

function _moveAnnotationsByOffset(app: GisAppState, offset: -1 | 1): void {
  app.updateConfig((current) => {
    return AvaMapConfig.withAnnotationsZIndex({
      config: current,
      annotationsZIndex: current.annotationsZIndex - offset,
    });
  });
}

/** Renders the layer stack with actions that update the editable map config. */
export function GisAppLayerPanel({ app, actions }: Props): ReactNode {
  return (
    <LayerPanel
      rows={app.rows}
      viewStates={app.layerViewStates}
      selectedLayerId={app.selectedLayerId}
      annotations={app.mapConfig.annotations}
      annotationsZIndex={app.mapConfig.annotationsZIndex}
      isAnnotationRowSelected={app.isAnnotationRowSelected}
      isCollapsed={app.panelState.layers}
      onToggleCollapsed={() => {
        app.togglePanel("layers");
      }}
      {...actions}
      onSelectLayer={(layerId) => {
        _selectDataLayer(app, layerId);
      }}
      onSelectAnnotationRow={() => {
        app.setIsAnnotationRowSelected(true);
        app.setSelectedLayerId(undefined);
      }}
      onToggleAnnotationsVisible={() => {
        _toggleAnnotationsVisible(app);
      }}
      onMoveAnnotationsByOffset={(offset) => {
        _moveAnnotationsByOffset(app, offset);
      }}
    />
  );
}
