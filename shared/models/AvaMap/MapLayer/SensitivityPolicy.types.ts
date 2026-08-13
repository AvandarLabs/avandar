/**
 * What rendering a layer's data permits, independent of what the author picks.
 *
 * - `exact`: render coordinates as given.
 * - `jitter`: displace each point deterministically within `radiusMeters`, so
 *   an approximate location is shown without revealing the exact one.
 * - `aggregateOnly`: exact points may never be drawn. Cells holding fewer than
 *   `minCellCount` records are suppressed rather than shown as zero.
 */
export type SensitivityPolicy =
  | { mode: "exact" }
  | { mode: "jitter"; radiusMeters: number }
  | { mode: "aggregateOnly"; minCellCount: number; minGeoLevel: string };
