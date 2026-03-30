export type PieChartVizConfig = {
  vizType: "pie";

  /**
   * The column whose values label each slice (name / category).
   * This is a column name, not an ID.
   */
  nameKey: string | undefined;

  /**
   * The numeric column whose values determine slice size.
   * This is a column name, not an ID.
   */
  valueKey: string | undefined;

  /** Render the chart as a donut instead of a filled pie. */
  isDonut: boolean;

  /**
   * Render a label on each slice when `true`. Labels show either the
   * raw value or a percentage based on `labelsType`.
   */
  withLabels: boolean;

  /** Controls what each label displays. Defaults to `"value"`. */
  labelsType: "value" | "percent";
};
