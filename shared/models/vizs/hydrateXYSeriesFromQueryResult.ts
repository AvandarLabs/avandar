import { VizHydrationColumns } from "$/models/vizs/VizHydrationColumns.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { RenderAs, XYSeries } from "$/models/vizs/SeriesConfig.ts";

type XYSeriesConfig = {
  xAxisKey: QueryColumn.Id | undefined;
  series: readonly XYSeries[];
};

/**
 * Seeds unconfigured slots from column IDs and preserves existing selections
 * and styles, including identities absent from the current result.
 */
export function hydrateXYSeriesFromQueryResult<VConfig extends XYSeriesConfig>(
  currVizConfig: VConfig,
  columns: readonly QueryResult.BoundColumn[],
  defaultRenderAs: RenderAs,
): VConfig {
  if (columns.length === 0) {
    return currVizConfig;
  }

  let nextSeries: XYSeries[] = [...currVizConfig.series];

  if (nextSeries.length === 0) {
    const firstNumericId = VizHydrationColumns.getFirstNumericColumnId(columns);
    if (firstNumericId !== undefined) {
      nextSeries = [{ renderAs: defaultRenderAs, key: firstNumericId }];
    }
  }

  let nextXAxisKey = currVizConfig.xAxisKey;
  if (nextXAxisKey === undefined && nextSeries.length > 0) {
    const seriesKeys = new Set(
      nextSeries.map((s) => {
        return s.key;
      }),
    );
    nextXAxisKey = VizHydrationColumns.getCategoryColumnId({
      columns,
      excludedIds: seriesKeys,
    });
  }

  return {
    ...currVizConfig,
    xAxisKey: nextXAxisKey,
    series: nextSeries,
  };
}
