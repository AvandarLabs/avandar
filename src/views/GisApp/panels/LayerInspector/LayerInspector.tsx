import { useLingui } from "@lingui/react/macro";
import { useEffect, useRef } from "react";
import { LayerInspectorBody } from "@/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorBody";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";
import { GIS_SKIP_TARGET_IDS } from "@/views/GisApp/shell/SkipLinks/SkipLinks.constants";
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
  inspectorView: LayerInspectorView;
  onInspectorViewChange: (view: LayerInspectorView) => void;
  filterFocusRequest?: number;
};

/** Inspector-local navigation that does not alter persisted collapse state. */
export type LayerInspectorView =
  | { type: "sections" }
  | { type: "matchReport" }
  | { type: "classification" }
  | { type: "validationReport" };

function _getOrCreateSet<T>(ref: { current: Set<T> | undefined }): Set<T> {
  const existing = ref.current;
  if (existing !== undefined) {
    return existing;
  }
  const created = new Set<T>();
  ref.current = created;
  return created;
}

/** The selected layer's editor, sectioned by the model's axes. */
export function LayerInspector({
  layer,
  viewState,
  isCollapsed,
  onToggleCollapsed,
  onLayerChange,
  inspectorView,
  onInspectorViewChange,
  filterFocusRequest,
}: Props): ReactNode {
  const { t } = useLingui();
  const openedFingerprints = useRef<Set<string> | undefined>(undefined);
  const fingerprints = _getOrCreateSet(openedFingerprints);
  const autoOpenEligibleLayerIds = useRef<Set<MapLayer.Id> | undefined>(
    undefined,
  );
  const shouldSeedEligibleLayerIds =
    autoOpenEligibleLayerIds.current === undefined;
  const eligibleLayerIds = _getOrCreateSet(autoOpenEligibleLayerIds);
  if (
    shouldSeedEligibleLayerIds &&
    layer?.geoBinding?.type === "joinToBoundaries"
  ) {
    eligibleLayerIds.add(layer.id);
  }
  const previousLayerIdRef = useRef(layer?.id);
  if (layer?.id !== previousLayerIdRef.current) {
    previousLayerIdRef.current = layer?.id;
    if (layer?.geoBinding?.type === "joinToBoundaries") {
      eligibleLayerIds.add(layer.id);
    }
  }
  const diagnostics = viewState?.spatialDiagnostics;
  useEffect(
    function openMatchReportForUnmatchedJoin() {
      if (
        !layer ||
        !eligibleLayerIds.has(layer.id) ||
        !diagnostics ||
        diagnostics.sourceCount === 0 ||
        diagnostics.matchedSourceKeyCount !== 0
      ) {
        return;
      }
      const fingerprint = `${layer.id}:${JSON.stringify(diagnostics)}`;
      if (!fingerprints.has(fingerprint)) {
        fingerprints.add(fingerprint);
        onInspectorViewChange({ type: "matchReport" });
      }
    },
    [diagnostics, eligibleLayerIds, fingerprints, layer, onInspectorViewChange],
  );
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
