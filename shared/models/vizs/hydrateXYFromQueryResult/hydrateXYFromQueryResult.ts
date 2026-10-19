import { VizHydrationColumns } from "$/models/vizs/VizHydrationColumns.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

type XYAxesConfig = {
  xAxisKey: QueryColumn.Id | undefined;
  yAxisKey: QueryColumn.Id | undefined;
};

/** XY chart families that use shared axis defaults. */
export type XYVizChartKind = "bar" | "line";

/**
 * Seeds unconfigured slots from column IDs and preserves existing selections
 * and styles, including identities absent from the current result.
 */
export function hydrateXYFromQueryResult<VConfig extends XYAxesConfig>(
  currVizConfig: VConfig,
  columns: readonly QueryResult.BoundColumn[],
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
