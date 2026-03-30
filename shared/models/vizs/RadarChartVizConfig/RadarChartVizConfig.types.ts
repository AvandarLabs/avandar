export type RadarChartVizConfig = {
  vizType: "radar";

  /**
   * The column whose values label each axis of the radar (category).
   * This is a column name, not an ID.
   */
  nameKey: string | undefined;

  /**
   * The numeric column whose values determine the magnitude on each axis.
   * This is a column name, not an ID.
   */
  valueKey: string | undefined;

  /** Optional CSS color override for the radar polygon (e.g. `"#ff0000"`). */
  color?: string;
};
