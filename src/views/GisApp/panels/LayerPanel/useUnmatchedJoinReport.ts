import { useEffect, useEffectEvent, useRef } from "react";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";

type Options = {
  layer: MapLayer.T | undefined;
  viewState: MapLayerViewState | undefined;
  onOpenMatchReport: () => void;
};

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

/**
 * Opens the match report once when the selected boundary join matches
 * nothing. The layer panel calls it so the report can replace the layer
 * list even while that list is what is on screen.
 */
export function useUnmatchedJoinReport({
  layer,
  viewState,
  onOpenMatchReport,
}: Options): void {
  const openedFingerprints = useRef<Set<string> | undefined>(undefined);
  const fingerprints = _getOrCreateSet(openedFingerprints);
  const autoOpenEligibleLayerIds = useRef<Set<MapLayer.Id> | undefined>(
    undefined,
  );
  const eligibleLayerIds = _getOrCreateSet(autoOpenEligibleLayerIds);
  const previousLayerIdRef = useRef<MapLayer.Id | undefined | "unset">("unset");
  const openMatchReport = useEffectEvent(() => {
    onOpenMatchReport();
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
}
