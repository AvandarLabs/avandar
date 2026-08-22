import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { useEffect, useEffectEvent, useRef } from "react";

import { LayerInspectorBody } from "@/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorBody";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";
import { GIS_SKIP_TARGET_IDS } from "@/views/GisApp/shell/SkipLinks/SkipLinks.constants";

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

function _getOrCreateSet<T>(ref: { current: Set<T> | undefined }): Set<T> {
  const existing = ref.current;
  if (existing !== undefined) {
    return existing;
  }
  const created = new Set<T>();
  ref.current = created;
  return created;
}

function _isFullyUnmatchedJoin(
  layer: MapLayer.T | undefined,
  viewState: MapLayerViewState | undefined,
): layer is MapLayer.T {
  const diagnostics = viewState?.spatialDiagnostics;
  return (
    layer !== undefined &&
    diagnostics !== undefined &&
    diagnostics.sourceCount !== 0 &&
    diagnostics.matchedSourceKeyCount === 0
  );
}

function _trackJoinLayerEligibility(options: {
  layer: MapLayer.T | undefined;
  eligibleLayerIds: Set<MapLayer.Id>;
  previousLayerIdRef: { current: MapLayer.Id | undefined | "unset" };
}): void {
  const { layer, eligibleLayerIds, previousLayerIdRef } = options;
  const previousLayerId = previousLayerIdRef.current;
  const shouldAdd =
    layer?.geoBinding?.type === "joinToBoundaries" &&
    (previousLayerId === "unset" || layer.id !== previousLayerId);
  if (shouldAdd && layer) {
    eligibleLayerIds.add(layer.id);
  }
  previousLayerIdRef.current = layer?.id;
}

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
  const openedFingerprints = useRef<Set<string> | undefined>(undefined);
  const fingerprints = _getOrCreateSet(openedFingerprints);
  const autoOpenEligibleLayerIds = useRef<Set<MapLayer.Id> | undefined>(
    undefined,
  );
  const eligibleLayerIds = _getOrCreateSet(autoOpenEligibleLayerIds);
  const previousLayerIdRef = useRef<MapLayer.Id | undefined | "unset">("unset");
  const openMatchReport = useEffectEvent(() => {
    onInspectorViewChange({ type: "matchReport" });
  });
  useEffect(
    function openMatchReportForUnmatchedJoin() {
      _trackJoinLayerEligibility({
        layer,
        eligibleLayerIds,
        previousLayerIdRef,
      });
      if (
        layer === undefined ||
        viewState === undefined ||
        !_isFullyUnmatchedJoin(layer, viewState) ||
        !eligibleLayerIds.has(layer.id)
      ) {
        return;
      }
      const fingerprint = `${layer.id}:${JSON.stringify(viewState.spatialDiagnostics)}`;
      if (fingerprints.has(fingerprint)) {
        return;
      }
      fingerprints.add(fingerprint);
      openMatchReport();
    },
    // useEffectEvent callbacks must not be listed in effect deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eligibleLayerIds, fingerprints, layer, viewState],
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
