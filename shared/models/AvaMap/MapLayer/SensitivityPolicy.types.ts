/**
 * What rendering a layer's data permits, independent of what the author picks.
 *
 * - `exact`: render coordinates as given.
 * - `jitter`: displace each point deterministically within `radiusMeters`, so
 *   an approximate location is shown without revealing the exact one.
 * - `aggregateOnly`: exact points may never be drawn. Cells holding fewer than
 *   `minCellCount` records are suppressed rather than shown as zero.
 */
export type ExactSensitivity = { mode: "exact" };

export type JitterSensitivity = { mode: "jitter"; radiusMeters: number };

export type AggregateOnlySensitivity = {
  mode: "aggregateOnly";
  minCellCount: number;
  minGeoLevel: string;
};

export type SensitivityPolicy =
  | ExactSensitivity
  | JitterSensitivity
  | AggregateOnlySensitivity;
