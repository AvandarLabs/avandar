export type BubbleChartVizConfig = {
  vizType: "bubble";

  /**
   * The numeric column for the X axis. This is a column name, not an ID.
   */
  xAxisKey: string | undefined;

  /**
   * The numeric column for the Y axis. This is a column name, not an ID.
   */
  yAxisKey: string | undefined;

  /**
   * The numeric column that controls bubble size. This is a column name,
   * not an ID.
   */
  sizeKey: string | undefined;
};
