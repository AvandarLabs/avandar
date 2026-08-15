import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";

export type MapLayerOperationalState =
  | { type: "rebindRequired" }
  | { type: "spatialUnavailable" }
  | { type: "queryError" }
  | { type: "suppressed"; count: number }
  | { type: "noData"; count: number }
  | { type: "partialMatch" }
  | { type: "unbound" | "loading" | "empty" | "ready" };

/** Applies one shared priority order to a layer's operational diagnostics. */
export function getMapLayerOperationalState(
  viewState: MapLayerViewState,
): MapLayerOperationalState {
  const errorMessage = viewState.error?.message ?? "";
  if (errorMessage.includes("requires rebinding")) {
    return { type: "rebindRequired" };
  }
  if (errorMessage.includes("Spatial is unavailable")) {
    return { type: "spatialUnavailable" };
  }
  if (viewState.status === "error") {
    return { type: "queryError" };
  }
  if ((viewState.suppressedCount ?? 0) > 0) {
    return { type: "suppressed", count: viewState.suppressedCount! };
  }
  if ((viewState.noDataCount ?? 0) > 0) {
    return { type: "noData", count: viewState.noDataCount! };
  }
  const diagnostics = viewState.spatialDiagnostics;
  const hasPartialMatch =
    viewState.droppedRowCount > 0 ||
    (diagnostics?.unmatchedSourceKeyCount ?? 0) > 0 ||
    (diagnostics?.duplicateBoundaryKeyCount ?? 0) > 0 ||
    (diagnostics?.invalidCount ?? 0) > 0 ||
    diagnostics?.hasMixedFamilies === true;
  if (hasPartialMatch) {
    return { type: "partialMatch" };
  }
  return { type: viewState.status };
}
