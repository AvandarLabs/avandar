import { useLingui } from "@lingui/react/macro";
import { LayerInspectorBody } from "@/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorBody";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";
import { GIS_SKIP_TARGET_IDS } from "@/views/GisApp/shell/SkipLinks/SkipLinks.constants";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { ReactNode } from "react";

/** An immutable update applied to the selected layer. */
export type LayerChangeHandler = (
  update: (current: MapLayer.T) => MapLayer.T,
) => void;

type Props = {
  layer: MapLayer.T | undefined;
  layers?: readonly MapLayer.T[];
  viewState: MapLayerViewState | undefined;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onLayerChange: LayerChangeHandler;
  inspectorView: LayerInspectorView;
  onInspectorViewChange: (view: LayerInspectorView) => void;
  filterFocusRequest?: number;
};

const EMPTY_LAYERS: readonly MapLayer.T[] = [];

/** Inspector-local navigation that does not alter persisted collapse state. */
export type LayerInspectorView =
  | { type: "sections" }
  | { type: "matchReport" }
  | { type: "classification" }
  | { type: "validationReport" };

/** The selected layer's editor, sectioned by the model's axes. */
export function LayerInspector({
  layer,
  layers = EMPTY_LAYERS,
  viewState,
  isCollapsed,
  onToggleCollapsed,
  onLayerChange,
  inspectorView,
  onInspectorViewChange,
  filterFocusRequest,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <MapChromePanel
      variant="inspector"
      id="gis-inspector"
      bodyId={GIS_SKIP_TARGET_IDS.inspectorBody}
      title={t`Layer`}
      isCollapsed={isCollapsed}
      onToggleCollapsed={onToggleCollapsed}
      collapseLabel={t`Collapse the layer panel`}
      expandLabel={t`Expand the layer panel`}
    >
      <LayerInspectorBody
        layer={layer}
        layers={layers}
        viewState={viewState}
        onLayerChange={onLayerChange}
        filterFocusRequest={filterFocusRequest}
        inspectorView={inspectorView}
        onOpenMatchReport={() => {
          onInspectorViewChange({ type: "matchReport" });
        }}
        onOpenClassification={() => {
          onInspectorViewChange({ type: "classification" });
        }}
        onCloseMatchReport={() => {
          onInspectorViewChange({ type: "sections" });
        }}
      />
    </MapChromePanel>
  );
}
