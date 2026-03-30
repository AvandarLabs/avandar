import type { CurveType } from "$/models/vizs/CurveType.ts";

export type LineChartVizConfig = {
  vizType: "line";

  /**
   * The key of the column to use for the X axis. This is a column name,
   * not an ID.
   *
   * TODO(jpsyx): create a concept of a QueryColumn and use QueryColumnId here.
   */
  xAxisKey: string | undefined;

  /**
   * The key of the column to use for the Y axis. This is a column name,
   * not an ID.
   *
   * TODO(jpsyx): create a concept of a QueryColumn and use QueryColumnId here.
   */
  yAxisKey: string | undefined;

  /** Show the chart legend when `true`. */
  withLegend: boolean;

  /** Curve interpolation style. Defaults to `"monotone"`. */
  curveType: CurveType;

  /** Optional CSS color override for the data series (e.g. `"#ff0000"`). */
  color?: string;
};
