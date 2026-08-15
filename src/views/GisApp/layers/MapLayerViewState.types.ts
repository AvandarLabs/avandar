import type { DropReason } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";

/**
 * The data health state shared by every surface that reports one map layer.
 */
export type MapLayerViewState = {
  status: "unbound" | "loading" | "error" | "empty" | "ready";

  /** The loading error, when `status` is `error`. */
  error: Error | undefined;

  featureCount: number;

  /** Rows the geometry conversion could not place. */
  droppedRowCount: number;

  /** The most frequent reason rows were dropped, when any were dropped. */
  largestDropReason: DropReason | undefined;

  /** Number of filter clauses on the layer query. */
  filterCount: number;

  /** Re-runs the layer query. */
  onRetry: () => void;
};
