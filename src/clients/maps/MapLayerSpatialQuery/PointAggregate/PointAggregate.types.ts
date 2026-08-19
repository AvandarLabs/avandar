import type { GeometryDropReport } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";

/** One drop reason and how many source rows hit it, counted in SQL. */
export type PointCoordinateDrop = Pick<GeometryDropReport, "reason" | "count">;

/**
 * What one point layer's source rows look like before any aggregation.
 *
 * Produced entirely in DuckDB, so these counts stay available for the layer's
 * status even when the browser never receives the underlying rows.
 */
export type PointCoordinateAudit = {
  /** Rows the layer's filtered source returns. */
  sourceRowCount: number;

  /** Rows carrying a coordinate a map can place. */
  mappableRowCount: number;

  /**
   * Distinct coordinates among the mappable rows.
   *
   * An upper bound on how many cells any grid resolution can produce, since
   * two rows at the same coordinate always share a cell. When it fits the cell
   * ceiling, no resolution needs checking.
   */
  distinctCoordinateCount: number;

  /** Why the remaining rows could not be placed. Empty when none were lost. */
  drops: PointCoordinateDrop[];
};

/** How one point layer's rows were reduced before reaching the browser. */
export type PointAggregation = {
  /** Cell resolution across the world that produced these rows. */
  cellsAcross: number;

  /** Source rows the cells represent, which is the audit's mappable count. */
  aggregatedRowCount: number;

  /**
   * True when the requested resolution was coarsened to fit the cell ceiling.
   * The layer still covers every row; it just groups more of them together.
   */
  didCoarsenGrid: boolean;
};
