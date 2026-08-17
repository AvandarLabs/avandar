/** Where a layer's legend sits over the map, or `hidden` to omit it. */
export type LegendPosition =
  | "bottomLeft"
  | "bottomRight"
  | "topRight"
  | "hidden";

/** One numeric interval used by the active graduated classification. */
export type LegendBreak = {
  lower: number | undefined;
  upper: number | undefined;
};

/** One ordered row displayed by a map legend. */
export const LEGEND_ENTRY_TYPES = ["value", "noData", "suppressed"] as const;
export type LegendEntryType = (typeof LEGEND_ENTRY_TYPES)[number];

export type LegendEntry = {
  type: LegendEntryType;
  color: string;
  label: string;
  count: number;
};

/** One frozen value and radius displayed by a proportional-symbol legend. */
export type SizeLegendStop = {
  value: number;
  radiusPx: number;
  label: string;
};

/**
 * A layer's legend. Persisted rather than derived at render time so that the
 * live map, a dashboard embed, and an exported PDF cannot disagree.
 */
export type LegendConfig = {
  title: string;
  units: string | undefined;
  showNoData: boolean;
  position: LegendPosition;
  breaks: readonly LegendBreak[];
  entries: readonly LegendEntry[];
  sizeStops: readonly SizeLegendStop[];
};
