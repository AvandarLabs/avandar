import {
  columnNameSet,
  pickCategoryColumnName,
  pickFirstNumericColumnName,
} from "$/models/vizs/hydrateColumnPicking.ts";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";
import type { RenderAs, XYSeries } from "$/models/vizs/SeriesConfig.ts";

type XYSeriesConfig = {
  xAxisKey: string | undefined;
  series: readonly XYSeries[];
};

/**
 * Reconcile an XY-series chart config (bar / line / area) against the
 * current query columns:
 *
 *   1. Prune `xAxisKey` if the named column is no longer in the result.
 *   2. Prune any `series[i]` whose `key` is no longer in the result.
 *   3. Seed the first series from the first numeric column when series
 *      is empty.
 *   4. Seed `xAxisKey` from a sensible category column when undefined
 *      (temporal, then text, then boolean, then another numeric).
 *
 * The goal: when a new SQL prompt changes the result columns, the
 * chart never silently references a missing column. Stale keys are
 * dropped and sensible defaults seeded so a config always renders
 * something useful as long as columns are non-empty.
 */
export function hydrateXYSeriesFromQueryResult<VConfig extends XYSeriesConfig>(
  currVizConfig: VConfig,
  columns: readonly QueryResultColumn[],
  defaultRenderAs: RenderAs,
): VConfig {
  if (columns.length === 0) {
    return currVizConfig;
  }
  const colNames = columnNameSet(columns);

  let nextSeries: XYSeries[] = currVizConfig.series.filter((s) => {
    return colNames.has(s.key);
  });

  if (nextSeries.length === 0) {
    const firstNumericName = pickFirstNumericColumnName(columns);
    if (firstNumericName !== undefined) {
      nextSeries = [{ renderAs: defaultRenderAs, key: firstNumericName }];
    }
  }

  let nextXAxisKey =
    currVizConfig.xAxisKey && colNames.has(currVizConfig.xAxisKey) ?
      currVizConfig.xAxisKey
    : undefined;
  if (nextXAxisKey === undefined && nextSeries.length > 0) {
    const seriesKeys = new Set(
      nextSeries.map((s) => {
        return s.key;
      }),
    );
    nextXAxisKey = pickCategoryColumnName(columns, seriesKeys);
  }

  return {
    ...currVizConfig,
    xAxisKey: nextXAxisKey,
    series: nextSeries,
  };
}
