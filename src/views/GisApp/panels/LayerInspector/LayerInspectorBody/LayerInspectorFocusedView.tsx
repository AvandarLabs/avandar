import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type {
  LayerChangeHandler,
  LayerInspectorView,
} from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { ClassificationEditor } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditor";
import { MatchReport } from "@/views/GisApp/panels/LayerInspector/MatchReport/MatchReport";
import { CoordinateValidationReport } from "@/views/GisApp/panels/MapStatusCard/CoordinateValidationReport/CoordinateValidationReport";

type Props = {
  layer: MapLayer.T;
  viewState: MapLayerViewState | undefined;
  onLayerChange: LayerChangeHandler;
  inspectorView: LayerInspectorView;
  onCloseMatchReport: () => void;
};

/** Renders a focused inspector view that replaces the section stack. */
export function LayerInspectorFocusedView({
  layer,
  viewState,
  onLayerChange,
  inspectorView,
  onCloseMatchReport,
}: Props): ReactNode {
  if (inspectorView.type === "matchReport" && viewState?.spatialDiagnostics) {
    return (
      <MatchReport
        diagnostics={viewState.spatialDiagnostics}
        onBack={onCloseMatchReport}
      />
    );
  }
  if (inspectorView.type === "classification") {
    return (
      <ClassificationEditor
        layer={layer}
        onLayerChange={onLayerChange}
        onBack={onCloseMatchReport}
      />
    );
  }
  if (inspectorView.type === "validationReport") {
    return (
      <CoordinateValidationReport
        drops={viewState?.drops ?? []}
        onBack={onCloseMatchReport}
        onSwapLatLng={() => {
          onLayerChange(MapLayerUpdates.swapLatLngColumns);
        }}
      />
    );
  }
  return null;
}
