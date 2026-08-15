import type { MapLayerSpatialDiagnostics } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.types";
import type { DropReason } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";

/** The data health state shared by every surface that reports one map layer. */
export type MapLayerViewState = {
  status: "unbound" | "loading" | "error" | "empty" | "ready";

  /** The loading error, when `status` is `error`. */
  error: Error | undefined;

  featureCount: number;

  /** Rows the geometry conversion could not place. */
  droppedRowCount: number;

  /** The most frequent reason rows were dropped, when any were dropped. */
  largestDropReason: DropReason | undefined;

  /** Diagnostics produced by DuckDB Spatial, when this is a spatial layer. */
  spatialDiagnostics?: MapLayerSpatialDiagnostics;

  /** Reportable contributors represented by aggregate features. */
  contributorCount?: number;

  /** Area features with no reportable value. */
  noDataCount?: number;

  /** Area features hidden by a sensitivity threshold. */
  suppressedCount?: number;

  /** Whether source values matched their configured boundary identities. */
  matchHealth?: "healthy" | "warning";

  /** Number of filter clauses on the layer query. */
  filterCount: number;

  /** Re-runs the layer query. */
  onRetry: () => void;
};
