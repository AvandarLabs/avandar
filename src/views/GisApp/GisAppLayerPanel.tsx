import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { LayerPanel } from "@/views/GisApp/panels/LayerPanel/LayerPanel";
import { LayerSettingsPanel } from "@/views/GisApp/panels/LayerPanel/LayerSettingsPanel";
import { useUnmatchedJoinReport } from "@/views/GisApp/panels/LayerPanel/useUnmatchedJoinReport";
import { GIS_SKIP_TARGET_IDS } from "@/views/GisApp/shell/SkipLinks/SkipLinks.constants";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { GisAppLayerActions } from "@/views/GisApp/useGisAppLayerActions";
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

function _layerList(app: GisAppState, actions: GisAppLayerActions): ReactNode {
  return (
    <LayerPanel
      variant="workspace"
      bodyId={GIS_SKIP_TARGET_IDS.inspectorBody}
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
        app.openLayerSettings();
      }}
      onSelectAnnotationRow={() => {
        app.setIsAnnotationRowSelected(true);
        app.setSelectedLayerId(undefined);
        app.openLayerSettings();
      }}
      onToggleAnnotationsVisible={() => {
        _toggleAnnotationsVisible(app);
      }}
      onMoveAnnotationsByOffset={(offset) => {
        _moveAnnotationsByOffset(app, offset);
      }}
      editor={
        app.layerPanelPage === "settings" ? (
          <LayerSettingsPanel app={app} actions={actions} />
        ) : null
      }
    />
  );
}

/**
 * The layer list, with the open layer's controls underneath it. The list
 * stays on screen while a layer is being edited.
 */
export function GisAppLayerPanel({ app, actions }: Props): ReactNode {
  const selectedViewState = app.selectedLayerId
    ? app.layerViewStates.get(app.selectedLayerId)
    : undefined;
  useUnmatchedJoinReport({
    layer: app.selectedLayer,
    viewState: selectedViewState,
    onOpenMatchReport: () => {
      app.onInspectorViewChange({ type: "matchReport" });
    },
  });
  return _layerList(app, actions);
}
