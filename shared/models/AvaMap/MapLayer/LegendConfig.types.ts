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
export type LegendEntry = {
  type: "value" | "noData" | "suppressed";
  color: string;
  label: string;
  count: number;
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
};
