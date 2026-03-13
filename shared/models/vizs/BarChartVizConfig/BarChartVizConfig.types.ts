export type BarChartVizConfig = {
  vizType: "bar";

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
};
