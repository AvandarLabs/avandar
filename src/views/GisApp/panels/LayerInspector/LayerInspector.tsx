import { useLingui } from "@lingui/react/macro";
import { LayerInspectorBody } from "@/views/GisApp/panels/LayerInspector/LayerInspectorBody";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";
import { GIS_SKIP_TARGET_IDS } from "@/views/GisApp/shell/SkipLinks/SkipLinks";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

/** An immutable update applied to the selected layer. */
export type LayerChangeHandler = (
  update: (current: MapLayer.T) => MapLayer.T,
) => void;

type Props = {
  layer: MapLayer.T | undefined;
  viewState: MapLayerViewState | undefined;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onLayerChange: LayerChangeHandler;
  filterFocusRequest?: number;
};

/** The selected layer's editor, sectioned by the model's axes. */
export function LayerInspector({
  layer,
  viewState,
  isCollapsed,
  onToggleCollapsed,
  onLayerChange,
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
        viewState={viewState}
        onLayerChange={onLayerChange}
        filterFocusRequest={filterFocusRequest}
      />
    </MapChromePanel>
  );
}
