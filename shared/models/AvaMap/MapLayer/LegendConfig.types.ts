/** Where a layer's legend sits over the map, or `hidden` to omit it. */
export type LegendPosition =
  | "bottomLeft"
  | "bottomRight"
  | "topRight"
  | "hidden";

/**
 * A layer's legend. Persisted rather than derived at render time so that the
 * live map, a dashboard embed, and an exported PDF cannot disagree.
 */
export type LegendConfig = {
  title: string;
  units: string | undefined;
  showNoData: boolean;
  position: LegendPosition;
};
