import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

export type FunnelChartVizConfig = {
  vizType: "funnel";

  /**
   * The column whose values label each funnel step (name / category).
   * This is a stable result-column ID.
   */
  nameKey: QueryColumn.Id | undefined;

  /**
   * The numeric column whose values determine step width.
   * This is a stable result-column ID.
   */
  valueKey: QueryColumn.Id | undefined;

  /**
   * Optional per-step color overrides, keyed by the step's name value.
   * Values are CSS color strings (e.g. `"#ff0000"` or `"blue.6"`).
   */
  seriesColors?: Record<string, string>;
};
