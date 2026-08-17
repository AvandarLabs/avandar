import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";

/**
 * One layer's operational condition, resolved to the single state its status
 * surfaces should show. The variants are ordered by the priority the resolver
 * applies: a rebind requirement outranks a query error, which outranks
 * suppression, and so on down to the plain query status.
 */
export type MapLayerOperationalState =
  | { type: "rebindRequired" }
  | { type: "spatialUnavailable" }
  | { type: "queryError" }
  | { type: "suppressed"; featureCount: number }
  | { type: "noData"; featureCount: number }
  | { type: "partialMatch" }
  | { type: "unbound" | "loading" | "empty" | "ready" };

/** Applies one shared priority order to a layer's operational diagnostics. */
export function getMapLayerOperationalState(
  viewState: MapLayerViewState,
): MapLayerOperationalState {
  const errorMessage = viewState.error?.message ?? "";
  const suppressedFeatureCount = viewState.suppressedCount ?? 0;
  const noDataFeatureCount = viewState.noDataCount ?? 0;
  const diagnostics = viewState.spatialDiagnostics;
  const hasPartialMatch =
    viewState.droppedRowCount > 0 ||
    (diagnostics?.unmatchedSourceKeyCount ?? 0) > 0 ||
    (diagnostics?.duplicateBoundaryKeyCount ?? 0) > 0 ||
    (diagnostics?.invalidCount ?? 0) > 0 ||
    diagnostics?.hasMixedFamilies === true;

  return (
    errorMessage.includes("requires rebinding") ? { type: "rebindRequired" }
    : errorMessage.includes("Spatial is unavailable") ?
      { type: "spatialUnavailable" }
    : viewState.status === "error" ? { type: "queryError" }
    : suppressedFeatureCount > 0 ?
      { type: "suppressed", featureCount: suppressedFeatureCount }
    : noDataFeatureCount > 0 ?
      { type: "noData", featureCount: noDataFeatureCount }
    : hasPartialMatch ? { type: "partialMatch" }
    : { type: viewState.status }
  );
}
