import { VizHydrationColumns } from "$/models/vizs/VizHydrationColumns.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

type XYAxesConfig = {
  xAxisKey: QueryColumn.Id | undefined;
  yAxisKey: QueryColumn.Id | undefined;
};

/**
 * Which XY chart a `hydrateXYFromQueryResult` caller is seeding. Bar and line
 * charts get the same axis defaults, so the kind does not change the result.
 */
export type XYVizChartKind = "bar" | "line";

/**
 * Fills the empty axis slots of a config with one X and one Y column from
 * `QueryResult` columns: the first numeric column for Y, then a column for X
 * preferring temporal, text, then boolean. X is filled only once Y has a
 * column. Set slots keep their column ID, even when the result lacks it.
 *
 * Use it so such a chart has something to draw once a result arrives, for
 * example from raw SQL, where there is no structured query to seed from.
 */
export function hydrateXYFromQueryResult<VConfig extends XYAxesConfig>(
  currVizConfig: VConfig,
  columns: readonly QueryResult.ColumnWithId[],
  _chartKind: XYVizChartKind,
): VConfig {
  if (columns.length === 0) {
    return currVizConfig;
  }

  let next: VConfig = { ...currVizConfig };

  if (next.yAxisKey === undefined) {
    const yColumnId = VizHydrationColumns.getFirstNumericColumnId(columns);
    if (yColumnId !== undefined) {
      next = { ...next, yAxisKey: yColumnId };
    }
  }

  const yKey = next.yAxisKey;

  if (next.xAxisKey === undefined && yKey !== undefined) {
    const xColumnId = VizHydrationColumns.getCategoryColumnId({
      columns,
      excludedIds: new Set([yKey]),
    });
    if (xColumnId !== undefined) {
      next = { ...next, xAxisKey: xColumnId };
    }
  }

  return next;
}
