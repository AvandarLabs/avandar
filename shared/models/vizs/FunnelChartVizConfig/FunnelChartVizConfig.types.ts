export type FunnelChartVizConfig = {
  vizType: "funnel";

  /**
   * The column whose values label each funnel step (name / category).
   * This is a column name, not an ID.
   */
  nameKey: string | undefined;

  /**
   * The numeric column whose values determine step width.
   * This is a column name, not an ID.
   */
  valueKey: string | undefined;
};
