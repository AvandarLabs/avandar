import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type {
  LayerChangeHandler,
  LayerInspectorView,
} from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";

import css from "@/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorBody.module.css";
import { LayerInspectorFocusedView } from "@/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorFocusedView";
import { LayerInspectorSections } from "@/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorSections";

type Props = {
  layer: MapLayer.T | undefined;
  layers?: readonly MapLayer.T[];
  viewState: MapLayerViewState | undefined;
  onLayerChange: LayerChangeHandler;
  filterFocusRequest?: number;
  inspectorView: LayerInspectorView;
  onOpenMatchReport: () => void;
  onOpenClassification: () => void;
  onCloseMatchReport: () => void;
};

const EMPTY_LAYERS: readonly MapLayer.T[] = [];

function _shouldShowFocusedView(options: {
  inspectorView: LayerInspectorView;
  viewState: MapLayerViewState | undefined;
}): boolean {
  const { inspectorView, viewState } = options;
  return (
    (inspectorView.type === "matchReport" &&
      viewState?.spatialDiagnostics !== undefined) ||
    inspectorView.type === "classification" ||
    inspectorView.type === "validationReport"
  );
}

/** Renders the selected layer's inspector sections. */
export function LayerInspectorBody({
  layer,
  layers = EMPTY_LAYERS,
  viewState,
  onLayerChange,
  filterFocusRequest,
  inspectorView,
  onOpenMatchReport,
  onOpenClassification,
  onCloseMatchReport,
}: Props): ReactNode {
  const { t } = useLingui();
  if (!layer) {
    return (
      <div className={css.layerInspectorBodyEmptyState}>
        {t`Select a layer to edit how it is queried and drawn.`}
      </div>
    );
  }
  if (_shouldShowFocusedView({ inspectorView, viewState })) {
    return (
      <LayerInspectorFocusedView
        layer={layer}
        viewState={viewState}
        onLayerChange={onLayerChange}
        inspectorView={inspectorView}
        onCloseMatchReport={onCloseMatchReport}
      />
    );
  }
  return (
    <LayerInspectorSections
      layer={layer}
      layers={layers}
      viewState={viewState}
      onLayerChange={onLayerChange}
      filterFocusRequest={filterFocusRequest}
      onOpenMatchReport={onOpenMatchReport}
      onOpenClassification={onOpenClassification}
    />
  );
}
