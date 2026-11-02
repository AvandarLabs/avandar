import { AnnotationInspectorPanel } from "@/views/GisApp/GisAppLayerInspector/AnnotationInspectorPanel";
import { LayerInspector } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { GisAppLayerActions } from "@/views/GisApp/useGisAppLayerActions";
import type { ReactNode } from "react";

type Props = {
  app: GisAppState;
  updateSelectedLayer: GisAppLayerActions["updateSelectedLayer"];
};

/** Supplies the selected layer or annotation to the inspector panel. */
export function GisAppLayerInspector({
  app,
  updateSelectedLayer,
}: Props): ReactNode {
  if (app.isAnnotationRowSelected) {
    return <AnnotationInspectorPanel app={app} />;
  }
  return (
    <LayerInspector
      layer={app.selectedLayer}
      layers={app.mapConfig.layers}
      viewState={
        app.selectedLayerId
          ? app.layerViewStates.get(app.selectedLayerId)
          : undefined
      }
      inspectorView={app.inspectorView}
      onInspectorViewChange={app.onInspectorViewChange}
      isCollapsed={app.panelState.inspector}
      onToggleCollapsed={() => {
        app.togglePanel("inspector");
      }}
      onLayerChange={updateSelectedLayer}
      filterFocusRequest={app.filterFocusRequest || undefined}
    />
  );
}
