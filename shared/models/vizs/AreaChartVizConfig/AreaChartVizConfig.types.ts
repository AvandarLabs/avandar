import type { CurveType } from "$/models/vizs/CurveType.ts";

export type AreaChartVizConfig = {
  vizType: "area";

  /**
   * The key of the column to use for the X axis. This is a column name,
   * not an ID.
   */
  xAxisKey: string | undefined;

  /**
   * The key of the column to use for the Y axis. This is a column name,
   * not an ID.
   */
  yAxisKey: string | undefined;

  /** Show the chart legend when `true`. */
  withLegend: boolean;

  /** Curve interpolation style. Defaults to `"monotone"`. */
  curveType: CurveType;
};
