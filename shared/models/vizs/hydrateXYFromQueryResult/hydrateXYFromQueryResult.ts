import {
  pickCategoryColumnId,
  pickFirstNumericColumnId,
} from "$/models/vizs/hydrateColumnPicking.ts";
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
    const yName = pickFirstNumericColumnId(columns);
    if (yName !== undefined) {
      next = { ...next, yAxisKey: yName };
    }
  }

  const yKey = next.yAxisKey;

  if (next.xAxisKey === undefined && yKey !== undefined) {
    const xName = pickCategoryColumnId(columns, new Set([yKey]));
    if (xName !== undefined) {
      next = { ...next, xAxisKey: xName };
    }
  }

  return next;
}
